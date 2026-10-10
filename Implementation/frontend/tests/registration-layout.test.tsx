import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { RegistrationEntry } from "../src/features/registration-qr/entry";
import type { EntryGrant, QrPort } from "../src/features/registration-qr/contracts";
import { createEntryVault } from "../src/app/entry-token";
const date=(n:number)=>new Date(n).toISOString().replace(/\.([0-9]{3})Z$/,".$1000Z");
/** C16 presentation tests retain real M02 component behavior and exercise the same availability gate in both layouts. */
beforeEach(()=>{
  Object.defineProperty(navigator,"onLine",{configurable:true,value:true});
  Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"});
});
for(const compact of [false,true]) {
  it("preserves authority, accessible copy and the offline fieldset in "+(compact?"compact":"default")+" entry",async()=>{
    const entry:EntryGrant={formContext:{grantReference:"synthetic-layout-grant",bindingVersion:1},scope:{environment:"test",counterId:"1",categoryScope:null},
      serverNow:date(Date.now()),grantExpiresAt:date(Date.now()+1200000)};
    const port:QrPort={capabilities:vi.fn(async()=>({enabled:true})),bootstrap:vi.fn(async()=>{}),entry:vi.fn(async()=>entry),exchange:vi.fn(async()=>entry),
      create:vi.fn(),current:vi.fn(),revoke:vi.fn()};
    const vault=createEntryVault({pathname:"/register",search:"",hash:""},{replaceState:()=>{}});
    render(<RegistrationEntry compact={compact} port={port} vault={vault}>{()=> <input aria-label="Guarded draft" defaultValue="Demo draft"/>}</RegistrationEntry>);
    const input=await screen.findByLabelText("Guarded draft");
    expect(screen.getByRole("heading",{name:"Pendaftaran pelawat"})).toBeTruthy();
    expect(screen.getByText("Akses borang aktif")).toBeTruthy();
    expect(screen.getByText("Kaunter 1 · semua kategori")).toBeTruthy();
    expect(screen.getByText("Tiada akaun diperlukan.")).toBeTruthy();
    const disclosure=document.querySelector(".qr-entry-help") as HTMLDetailsElement|null;
    if(compact) {expect(disclosure?.open).toBe(false);expect(screen.getByText("Panduan").tagName).toBe("SUMMARY");}
    else {expect(disclosure).toBeNull();}
    Object.defineProperty(navigator,"onLine",{configurable:true,value:false});fireEvent(window,new Event("offline"));
    await waitFor(()=>expect((input.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(true));
    expect((input as HTMLInputElement).value).toBe("Demo draft");
    expect(port.exchange).not.toHaveBeenCalled();
  });
}
