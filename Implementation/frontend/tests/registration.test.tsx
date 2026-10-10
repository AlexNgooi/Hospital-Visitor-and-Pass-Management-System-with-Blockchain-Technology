import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationPage } from "../src/features/registration/registration";
import { createRegistrationPort, receiptSchema, schemaReply, feedbackSchema,
  type RegistrationSchema, type RegistrationPort, type Submission, type FieldSpec } from "../src/features/registration/contracts";
import type { EntryGrant, QrPort } from "../src/features/registration-qr/contracts";
import { createEntryVault } from "../src/app/entry-token";
import { ApiClient } from "../src/lib/api-client";
import { ClientError } from "../src/lib/errors";
const date = (n: number) => new Date(n).toISOString().replace(/\.([0-9]{3})Z$/, ".$1000Z");
const entry: EntryGrant = { formContext:{grantReference:"synthetic_grant_1",bindingVersion:1},
  scope:{environment:"test",counterId:"1",categoryScope:null},serverNow:date(Date.now()),grantExpiresAt:date(Date.now()+1200000) };
const receipt = { publicReference:"R-" + "A".repeat(22) };
/** Typed synthetic metadata exercises the actual generic form, with no real visitor or provider records. */
function field(name: FieldSpec["name"], label: string, rule: FieldSpec["rule"]="TEXT",kind: FieldSpec["kind"]="TEXT",maxLength=100): FieldSpec {
  return { name,label,rule,kind,maxLength,hint:"",options:name==="identificationType"?[{value:"TEST_ID",label:"Demo ID"}]
    :name==="relationship"?[{value:"PARENT",label:"Ibu / bapa"}]:[] };
}
function schema(): RegistrationSchema {
  const shared = [field("fullName","Nama penuh"),field("identificationType","Jenis dokumen","ENUM","SELECT",7),
    field("identificationNumber","Nombor dokumen","DEMO_ID","TEXT",29),field("phone","Telefon","PHONE","PHONE",16)];
  return { formContext:entry.formContext,fieldSchemaVersion:"synthetic-registration-v1",source:"SYNTHETIC",notificationStatus:"NOT_ENABLED",
    privacy:{policyVersion:"synthetic-privacy-v1",text:"Demo sahaja. Gunakan data sintetik. WhatsApp belum diaktifkan."},
    categories:(["PENJAGA","EXECUTIVE","VENDOR","CONTRACTOR"] as const).map((code,index)=>({id:String(index+1),code,label:code,
      fields:[...shared,...(code==="PENJAGA"?[field("mrn","MRN demo","DEMO_MRN","TEXT",25),field("wardCode","Wad","REFERENCE","DESTINATION",32),field("relationship","Hubungan","ENUM","SELECT",16)]
        :[field(code==="EXECUTIVE"?"organisation":"company",code==="EXECUTIVE"?"Organisasi":"Syarikat","TEXT","TEXT",120),
          field("contactPerson","Pegawai dihubungi"),field("destinationCode","Lokasi","REFERENCE","DESTINATION",32),
          field(code==="EXECUTIVE"?"visitPurpose":code==="VENDOR"?"deliveryPurpose":"workPurpose","Tujuan","TEXT","TEXT",500)])]})),
    destinations:[{code:"DEMO_WARD",label:"Wad demo"}] };
}
function apiFailure(code: string,status: number) {return new ClientError("api",{timestamp:date(Date.now()),status,code,message:"untrusted",correlationId:"synthetic",fieldErrors:[]});}
function setup(schemaFailure=false) {
  const metadata=schema(),execute=vi.fn(async()=>receipt);
  const port:RegistrationPort={schema:vi.fn(async()=>metadata),feedback:vi.fn(async()=>({feedback:"MATCH" as const,mode:"mock" as const,source:"SYNTHETIC" as const,validationToken:"A".repeat(43),expiresAt:date(Date.now()+300000)})),
    submission:vi.fn(()=>({key:"499f48f8-fcc6-440a-9d29-81a3b7a9c515",execute}))};
  const qr:QrPort={capabilities:vi.fn(async()=>({enabled:true})),bootstrap:vi.fn(async()=>{}),entry:vi.fn(async()=>entry),
    exchange:vi.fn(async()=>entry),create:vi.fn(async()=>({displaySessionId:"35faef23-7bb2-45dc-88db-eae7ad344427"})),
    current:vi.fn(),revoke:vi.fn(async()=>{})};
  if(schemaFailure) vi.mocked(port.schema).mockRejectedValueOnce(new ClientError("network"));
  const vault=createEntryVault({pathname:"/register",search:"",hash:""},{replaceState:()=>{}});
  render(<RegistrationPage port={port} entryPort={qr} vault={vault}/>);
  return {port,qr,execute};
}
async function identity(category="PENJAGA") {
  await screen.findByLabelText("Nama penuh");
  fireEvent.change(screen.getByLabelText("Kategori pelawat"),{target:{value:category}});
  fireEvent.change(screen.getByLabelText("Nama penuh"),{target:{value:"Demo Visitor"}});
  fireEvent.change(screen.getByLabelText("Nombor dokumen"),{target:{value:"DEMO-VISITOR01"}});
  fireEvent.change(screen.getByLabelText("Telefon"),{target:{value:"+999123456789"}});
  fireEvent.click(screen.getByRole("button",{name:"Seterusnya"}));
  await screen.findByRole("heading",{name:"Butiran lawatan"});
}
async function visit(category="PENJAGA") {
  if(category==="PENJAGA") {
    fireEvent.change(screen.getByLabelText("MRN demo"),{target:{value:"DEMO-MRN-4821"}});
    fireEvent.change(screen.getByLabelText("Wad"),{target:{value:"DEMO_WARD"}});
    fireEvent.change(screen.getByLabelText("Hubungan"),{target:{value:"PARENT"}});
  } else {
    fireEvent.change(screen.getByLabelText(category==="EXECUTIVE"?"Organisasi":"Syarikat"),{target:{value:"Demo Company"}});
    fireEvent.change(screen.getByLabelText("Pegawai dihubungi"),{target:{value:"Demo Contact"}});
    fireEvent.change(screen.getByLabelText("Lokasi"),{target:{value:"DEMO_WARD"}});
    fireEvent.change(screen.getByLabelText("Tujuan"),{target:{value:"Demo visit"}});
  }
}
async function submit() {
  fireEvent.click(screen.getByRole("button",{name:"Seterusnya"}));
  await screen.findByRole("heading",{name:"Semak pendaftaran"});
  fireEvent.click(screen.getByLabelText("Saya telah membaca dan mengakui notis demo ini."));
  fireEvent.click(screen.getByRole("button",{name:"Hantar pendaftaran"}));
}
beforeEach(()=>{
  Object.defineProperty(navigator,"onLine",{configurable:true,value:true});
  Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"});
});
describe("synthetic registration form",()=>{
  it("explicitly retries failed metadata after parent entry revalidation, using only the original context",async()=>{
    const {port}=setup(true);await screen.findByRole("button",{name:"Cuba semula borang"});
    Object.defineProperty(navigator,"onLine",{configurable:true,value:false});fireEvent(window,new Event("offline"));
    expect((screen.getByRole("button",{name:"Cuba semula borang"}).closest("fieldset") as HTMLFieldSetElement).disabled).toBe(true);
    Object.defineProperty(navigator,"onLine",{configurable:true,value:true});fireEvent(window,new Event("online"));
    await waitFor(()=>expect((screen.getByRole("button",{name:"Cuba semula borang"}).closest("fieldset") as HTMLFieldSetElement).disabled).toBe(false));
    expect(port.schema).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button",{name:"Cuba semula borang"}));
    await screen.findByLabelText("Nama penuh");
    expect(port.schema).toHaveBeenCalledTimes(2);
    expect(vi.mocked(port.schema).mock.calls.every(call=>call[0]===entry.formContext)).toBe(true);
  });
  for(const category of ["PENJAGA","EXECUTIVE","VENDOR","CONTRACTOR"]) {
    it("submits the "+category+" whitelist and only displays a minimal reference",async()=>{
      const {port}=setup();await identity(category);await visit(category);await submit();
      await screen.findByRole("heading",{name:"Pendaftaran diterima"});
      const body=vi.mocked(port.submission).mock.calls[0][0];
      expect(body.categoryCode).toBe(category);expect(body.formContext).toEqual(entry.formContext);
      expect(body.privacyAcknowledgement.acknowledged).toBe(true);
      expect("mrnValidationToken" in body).toBe(false);
      expect(screen.queryByText("Demo Visitor")).toBeNull();
      expect(screen.getByText(receipt.publicReference)).toBeTruthy();
      expect(screen.queryByRole("checkbox")).toBeNull();
    });
  }
  it("focuses linked summary and inline invalid fields before progressing",async()=>{
    const {port}=setup();await screen.findByLabelText("Nama penuh");
    fireEvent.click(screen.getByRole("button",{name:"Seterusnya"}));
    await waitFor(()=>expect(document.activeElement?.tagName).toBe("SUMMARY"));
    expect(screen.getByLabelText("Nama penuh").getAttribute("aria-invalid")).toBe("true");
    const focusedSummary=document.activeElement!;
    fireEvent.click(focusedSummary);
    expect((focusedSummary.closest("details") as HTMLDetailsElement).open).toBe(true);
    fireEvent.click(screen.getByRole("link",{name:"Nama penuh"}));expect(document.activeElement).toBe(screen.getByLabelText("Nama penuh"));
    fireEvent.change(screen.getByLabelText("Nama penuh"),{target:{value:"D"}});
    expect(document.activeElement).toBe(screen.getByLabelText("Nama penuh"));
    expect(port.submission).not.toHaveBeenCalled();
  });
  it("requires explicit acknowledgement and retains values across steps",async()=>{
    const {port}=setup();await identity();await visit();
    fireEvent.click(screen.getByRole("button",{name:"Seterusnya"}));await screen.findByRole("heading",{name:"Semak pendaftaran"});
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("button",{name:"Hantar pendaftaran"}));
    expect(port.submission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Kembali"}));expect((screen.getByLabelText("MRN demo") as HTMLInputElement).value).toBe("DEMO-MRN-4821");
  });
  it("keeps UNKNOWN retries outside revoked/offline/resumed grant inputs, with the same handle after later API failures",async()=>{
    const {port,qr,execute}=setup();execute.mockRejectedValueOnce(new ClientError("network"));
    await identity();await visit();await submit();
    await screen.findByRole("heading",{name:"Hasil belum disahkan"});
    vi.mocked(qr.entry).mockRejectedValue(apiFailure("REGISTRATION_ENTRY_REQUIRED",403));
    const reads=vi.mocked(qr.entry).mock.calls.length;
    Object.defineProperty(navigator,"onLine",{configurable:true,value:false});fireEvent(window,new Event("offline"));
    fireEvent(window,new Event("pageshow"));
    expect(screen.queryByRole("group")).toBeNull();
    expect((screen.getByRole("button",{name:"Cuba semula permohonan asal"}) as HTMLButtonElement).disabled).toBe(false);
    execute.mockRejectedValueOnce(apiFailure("REGISTRATION_ENTRY_EXPIRED",410));
    fireEvent.click(screen.getByRole("button",{name:"Cuba semula permohonan asal"}));
    await waitFor(()=>expect(execute).toHaveBeenCalledTimes(2));
    await waitFor(()=>expect((screen.getByRole("button",{name:"Cuba semula permohonan asal"}) as HTMLButtonElement).disabled).toBe(false));
    Object.defineProperty(navigator,"onLine",{configurable:true,value:true});fireEvent(window,new Event("online"));
    fireEvent.click(screen.getByRole("button",{name:"Cuba semula permohonan asal"}));
    await screen.findByRole("heading",{name:"Pendaftaran diterima"});
    expect(execute).toHaveBeenCalledTimes(3);expect(port.submission).toHaveBeenCalledTimes(1);
    expect(qr.entry).toHaveBeenCalledTimes(reads);
  });
  it("restores a known rejected draft only under its original context",async()=>{
    const {execute}=setup();execute.mockRejectedValueOnce(apiFailure("VALIDATION_FAILED",400));
    await identity();await visit();await submit();
    await screen.findByRole("heading",{name:"Semak pendaftaran"});
    expect(screen.getByText("Demo Visitor")).toBeTruthy();
    expect(screen.queryByRole("heading",{name:"Hasil belum disahkan"})).toBeNull();
  });
  it("invalidates MRN feedback when MRN or ward changes and never infers staff verification",async()=>{
    const {port}=setup();await identity();await visit();
    fireEvent.click(screen.getByRole("button",{name:"Semak MRN demo"}));
    await screen.findByText("Padanan demo. Pengesahan manual kakitangan masih diperlukan.");
    fireEvent.change(screen.getByLabelText("MRN demo"),{target:{value:"DEMO-MRN-9999"}});
    await submit();await screen.findByRole("heading",{name:"Pendaftaran diterima"});
    expect("mrnValidationToken" in vi.mocked(port.submission).mock.calls[0][0]).toBe(false);
  });
  it("accepts 100 composed codepoints from a 300-unit decomposed name without a UTF16 maxlength",async()=>{
    setup();await identity();fireEvent.click(screen.getByRole("button",{name:"Kembali"}));
    const input=screen.getByLabelText("Nama penuh");
    expect(input.getAttribute("maxlength")).toBeNull();
    fireEvent.change(input,{target:{value:"\u00a0\u2007\u202f"}});
    fireEvent.click(screen.getByRole("button",{name:"Seterusnya"}));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(input,{target:{value:"a\u0306\u0301".repeat(100)}});
    fireEvent.click(screen.getByRole("button",{name:"Seterusnya"}));
    await screen.findByRole("heading",{name:"Butiran lawatan"});
  });
});
describe("wire and exact recovery transport",()=>{
  it("rejects unknown/PII receipt data and malformed metadata/feedback",()=>{
    expect(receiptSchema.safeParse({...receipt,phone:"demo"}).success).toBe(false);
    const invalid=schema();invalid.categories[0].fields.push(invalid.categories[0].fields[0]);
    expect(schemaReply.safeParse(invalid).success).toBe(false);
    expect(feedbackSchema.safeParse({feedback:"MATCH",source:"SYNTHETIC",mode:"manual",validationToken:"A".repeat(43),expiresAt:null}).success).toBe(false);
  });
  it("retries identical serialized body/context/key without storing or logging them",async()=>{
    const calls:{body:string;key:string|null}[]=[];
    const fetcher=vi.fn(async(path:RequestInfo|URL,init?:RequestInit)=>{
      if(String(path)==="/api/public/csrf") return new Response(JSON.stringify({headerName:"X-CSRF-TOKEN",token:"synthetic-csrf"}),{headers:{"content-type":"application/json"}});
      calls.push({body:String(init?.body),key:new Headers(init?.headers).get("Idempotency-Key")});
      if(calls.length===1) throw new Error("Owned synthetic network failure");
      return new Response(JSON.stringify(receipt),{status:201,headers:{"content-type":"application/json"}});
    });
    const body:Submission={formContext:{...entry.formContext},categoryCode:"VENDOR",fieldSchemaVersion:"synthetic-registration-v1",
      formData:{fullName:"Demo Original"},privacyAcknowledgement:{acknowledged:true,policyVersion:"synthetic-privacy-v1"}};
    const command=createRegistrationPort(new ApiClient(fetcher as typeof fetch)).submission(body);
    await expect(command.execute()).rejects.toBeInstanceOf(ClientError);
    (body.formData as Record<string,string>).fullName="Changed after dispatch";
    await expect(command.execute()).resolves.toEqual(receipt);
    expect(calls[0]).toEqual(calls[1]);expect(calls[0].body).not.toContain("Changed after dispatch");
    expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  });
});
