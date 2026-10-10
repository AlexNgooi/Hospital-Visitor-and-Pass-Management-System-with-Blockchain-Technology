// Playwright CLI exercises real owned MySQL/servlet/Vite. Only synthetic input and safe measured results are retained.
/* eslint-disable no-unused-expressions -- The CLI invokes this function expression with its owned page. */
async (page) => {
  const origin="http://127.0.0.1:15303",root="output/playwright/m03-registration/";
  const checks=[],errors=[],statuses=[];
  page.on("pageerror",error=>errors.push(error.name));
  await page.context().clearCookies();await page.goto(origin+"/login");await page.setViewportSize({width:1366,height:768});
  await page.getByLabel("Username / Staff account").fill("staff_integration");
  await page.getByLabel("Password",{exact:true}).fill("Synthetic-only-password_1");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();await page.waitForURL("**/staff");
  await page.getByRole("navigation",{name:"Counter navigation"}).getByRole("link",{name:"Registration QR",exact:true}).click();
  const created=page.waitForResponse(response=>response.url().endsWith("/api/staff/registration-qr-sessions")&&response.request().method()==="POST");
  await page.getByRole("button",{name:"Display registration QR",exact:true}).click();
  const display=(await (await created).json()).displaySessionId;
  await page.getByRole("img",{name:/Scan this current QR/}).waitFor();
  const contexts=[];

  /** Entry URLs/cookies/capabilities remain only in memory, never a receipt, snapshot or screenshot. */
  async function visitor(width=375,height=812,schemaFault=false) {
    const currentResponse=await page.request.get(origin+"/api/staff/registration-qr-sessions/"+display+"/current");
    const current=await currentResponse.json();
    if(currentResponse.status()!==200||typeof current.entryUrl!=="string") throw new Error("Current QR read failed with status "+currentResponse.status());
    const context=await page.context().browser().newContext({viewport:{width,height}});
    contexts.push(context);const target=await context.newPage();
    target.on("pageerror",error=>errors.push(error.name));
    target.on("response",response=>{
      const path=new URL(response.url()).pathname;
      if(path.startsWith("/api/")) statuses.push({path,method:response.request().method(),status:response.status()});
    });
    if(schemaFault) {
      let reads=0;
      await target.route("**/api/public/registration-schema",async route=>{
        reads++;
        if(reads===1) await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({
          timestamp:new Date().toISOString().replace(/\.([0-9]{3})Z$/,".$1000Z"),status:503,code:"SERVICE_UNAVAILABLE",message:"Owned synthetic response fault",correlationId:"synthetic-browser",fieldErrors:[]})});
        else await route.continue();
      });
    }
    await target.goto(current.entryUrl);
    if(!schemaFault) await target.getByLabel("Nama penuh").waitFor();
    return target;
  }
  /** Layout/axe evidence contains no form bodies or capabilities; synthetic screenshots are safe to retain. */
  async function audit(target,name,primary,fit=true) {
    await target.evaluate(()=>window.scrollTo(0,0));
    await target.addScriptTag({path:"node_modules/axe-core/axe.min.js"});
    const result=await target.evaluate(async label=>{
      const button=[...document.querySelectorAll("button")].find(element=>element.textContent.trim()===label);
      const box=button?.getBoundingClientRect();
      return {violations:(await window.axe.run(document.body)).violations.map(value=>value.id),
        overflow:document.documentElement.scrollWidth>innerWidth,fragmentCleared:!location.hash,
        storageEmpty:localStorage.length===0&&sessionStorage.length===0,
        viewport:{width:innerWidth,height:innerHeight},documentHeight:document.documentElement.scrollHeight,
        primary:box?{top:box.top,bottom:box.bottom,height:box.height,width:box.width}:null};
    },primary);
    if(result.violations.length||result.overflow||!result.fragmentCleared||!result.storageEmpty
      ||!result.primary||result.primary.height<44||result.primary.width<44
      ||fit&&(result.primary.top<0||result.primary.bottom>result.viewport.height+1||result.documentHeight>result.viewport.height+1)) {
      throw new Error("Registration browser audit "+name+" "+JSON.stringify(result));
    }
    checks.push({name,...result,firstScreenRequired:fit});
    await target.screenshot({path:root+name+".png",fullPage:true});
  }
  async function identity(target,category) {
    await target.getByLabel("Kategori pelawat").selectOption(category);
    await target.getByLabel("Nama penuh").fill("Demo Visitor");
    await target.getByLabel("No. pengenalan demo").fill("DEMO-VISITOR01");
    await target.getByLabel("No. telefon demo").fill("+999123456789");
    await target.getByRole("button",{name:"Seterusnya",exact:true}).click();
    await target.getByRole("heading",{name:"Butiran lawatan",exact:true}).waitFor();
  }
  async function visit(target,category) {
    if(category==="PENJAGA") {
      await target.getByLabel("MRN demo",{exact:true}).fill("DEMO-MRN-4821");
      await target.getByLabel("Wad",{exact:true}).selectOption("DEMO_WARD");
      await target.getByLabel("Hubungan dengan pesakit").selectOption("PARENT");
    } else {
      await target.getByLabel(category==="EXECUTIVE"?"Organisasi":"Syarikat",{exact:true}).fill("Demo Organisation");
      await target.getByLabel("Pegawai dihubungi").fill("Demo Contact");
      await target.getByLabel(category==="CONTRACTOR"?"Lokasi kerja":"Jabatan / lokasi",{exact:true}).selectOption("DEMO_OFFICE");
      await target.getByLabel(category==="EXECUTIVE"?"Tujuan lawatan":category==="VENDOR"?"Tujuan penghantaran":"Tujuan kerja",{exact:true}).fill("Demo purpose");
    }
  }
  async function review(target) {
    await target.getByRole("button",{name:"Seterusnya",exact:true}).click();
    await target.getByRole("heading",{name:"Semak pendaftaran",exact:true}).waitFor();
    if(await target.getByRole("checkbox").isChecked()) throw new Error("Privacy acknowledgement preselected");
    await target.getByRole("checkbox").check();
  }
  const mobile=await visitor();
  await audit(mobile,"identity-mobile375","Seterusnya");
  await mobile.locator(".qr-entry-help summary").focus();await mobile.keyboard.press("Enter");
  if(!await mobile.locator(".qr-entry-help").evaluate(element=>element.open)||!await mobile.getByText("Tiada akaun diperlukan.",{exact:true}).isVisible()) throw new Error("Keyboard entry guidance failed");
  await audit(mobile,"guidance-expanded-mobile375","Seterusnya",false);
  await mobile.locator(".qr-entry-help summary").focus();await mobile.keyboard.press("Enter");
  checks.push({name:"compact-guidance-keyboard",originalCopyAvailable:true,defaultCollapsed:true});
  await mobile.getByRole("button",{name:"Seterusnya",exact:true}).click();
  await mobile.locator(".registration-errors").waitFor();
  if(!await mobile.locator(".registration-errors summary").evaluate(element=>element===document.activeElement)) throw new Error("Error summary focus missing");
  await audit(mobile,"invalid-mobile375","Seterusnya");
  await mobile.locator(".registration-errors summary").focus();await mobile.keyboard.press("Enter");
  if(!await mobile.locator(".registration-errors").evaluate(element=>element.open)) throw new Error("Keyboard error disclosure failed");
  await audit(mobile,"invalid-expanded-mobile375","Seterusnya",false);
  await mobile.getByRole("link",{name:"Nama penuh",exact:true}).click();
  if(!await mobile.getByLabel("Nama penuh").evaluate(element=>element===document.activeElement)) throw new Error("Error link did not focus input");
  await mobile.getByLabel("Nama penuh").fill("D");
  if(!await mobile.getByLabel("Nama penuh").evaluate(element=>element===document.activeElement)) throw new Error("Editing one error stole focus");
  await mobile.getByRole("button",{name:"Seterusnya",exact:true}).focus();
  if(!await mobile.getByRole("button",{name:"Seterusnya",exact:true}).evaluate(element=>{
    const box=element.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight+1;
  })) throw new Error("Error-state action unreachable by keyboard");
  checks.push({name:"invalid-linked-summary",focused:true,noWrite:true});
  await identity(mobile,"PENJAGA");await visit(mobile,"PENJAGA");
  await audit(mobile,"penjaga-visit-mobile375","Seterusnya");
  await mobile.getByRole("button",{name:"Semak MRN demo",exact:true}).click();
  await mobile.getByText("Padanan demo. Pengesahan manual kakitangan masih diperlukan.",{exact:true}).waitFor();
  await audit(mobile,"mrn-match-mobile375","Seterusnya");
  // Editing MRN after a successful feedback invalidates its token and allows explicit manual deferral.
  await mobile.getByLabel("MRN demo",{exact:true}).fill("DEMO-MRN-9999");
  if(await mobile.getByText("Padanan demo. Pengesahan manual kakitangan masih diperlukan.",{exact:true}).count()) throw new Error("Stale MRN feedback retained");
  await review(mobile);await audit(mobile,"penjaga-review-mobile375","Hantar pendaftaran");
  const sent=mobile.waitForResponse(response=>response.url().endsWith("/api/public/registrations"));
  await mobile.getByRole("button",{name:"Hantar pendaftaran",exact:true}).click();
  const accepted=await sent,result=await accepted.json();
  if(accepted.status()!==201||Object.keys(result).join()!=="publicReference") throw new Error("Public receipt contract changed");
  await mobile.getByRole("heading",{name:"Pendaftaran diterima"}).waitFor();
  if(await mobile.getByText("Demo Visitor",{exact:true}).count()||await mobile.locator("input").count()) throw new Error("Sensitive form retained on receipt");
  await mobile.screenshot({path:root+"receipt-mobile375.png",fullPage:true});
  checks.push({name:"real-penjaga-submit",status:201,receiptOnlyReference:true,mrnFeedbackInvalidated:true,noStaffVerificationClaim:true});
  for(const category of ["PENJAGA","EXECUTIVE","VENDOR","CONTRACTOR"]) {
    const target=await visitor(1366,768);
    await target.getByLabel("Kategori pelawat").selectOption(category);
    await audit(target,category.toLowerCase()+"-identity-desktop","Seterusnya");
    await identity(target,category);await visit(target,category);
    await audit(target,category.toLowerCase()+"-visit-desktop","Seterusnya");
    await target.setViewportSize({width:375,height:812});await audit(target,category.toLowerCase()+"-visit-mobile375","Seterusnya");
    await review(target);await audit(target,category.toLowerCase()+"-review-mobile375","Hantar pendaftaran");
    await target.setViewportSize({width:1366,height:768});await audit(target,category.toLowerCase()+"-review-desktop","Hantar pendaftaran");
    await target.setViewportSize({width:375,height:812});
    await target.getByRole("button",{name:"Hantar pendaftaran",exact:true}).click();
    await target.getByRole("heading",{name:"Pendaftaran diterima"}).waitFor();
    checks.push({name:"real-"+category.toLowerCase()+"-submit",accepted:true,manualCounterRequired:true});
  }
  const uncertain=await visitor();await identity(uncertain,"VENDOR");await visit(uncertain,"VENDOR");await review(uncertain);
  let attempts=0,originalBody,originalKey,exactReplay=false,offline=false;
  await uncertain.route("**/api/public/registrations",async route=>{
    // route.fetch uses an APIRequestContext, so explicitly preserve the browser's owned offline fault before server dispatch.
    if(offline) {await route.abort();return;}
    attempts++;const request=route.request(),body=request.postData(),key=request.headers()["idempotency-key"];
    if(attempts===1) {originalBody=body;originalKey=key;}
    else {exactReplay=body===originalBody&&key===originalKey;}
    const response=await route.fetch();
    if(attempts===1) {if(response.status()!==201) throw new Error("Response-loss fixture did not commit");await route.abort();}
    else await route.fulfill({response});
  });
  await uncertain.getByRole("button",{name:"Hantar pendaftaran",exact:true}).click();
  await uncertain.getByRole("heading",{name:"Hasil belum disahkan"}).waitFor();
  if((await uncertain.request.get(origin+"/api/public/registration-entry")).status()!==403) throw new Error("Consumed grant still readable");
  await audit(uncertain,"unknown-consumed-mobile375","Cuba semula permohonan asal");
  offline=true;await uncertain.context().setOffline(true);
  await uncertain.evaluate(()=>{window.dispatchEvent(new Event("offline"));window.dispatchEvent(new Event("pageshow"));});
  await uncertain.getByRole("button",{name:"Cuba semula permohonan asal",exact:true}).click();
  await uncertain.waitForFunction(()=>!document.querySelector(".registration-result button")?.disabled);
  if(await uncertain.locator("fieldset").count()||attempts!==1) throw new Error("UNKNOWN attempted fresh authority or offline automatic write");
  offline=false;await uncertain.context().setOffline(false);
  await uncertain.evaluate(()=>window.dispatchEvent(new Event("online")));
  if(attempts!==1) throw new Error("Online automatically retried write");
  await uncertain.getByRole("button",{name:"Cuba semula permohonan asal",exact:true}).click();
  await uncertain.getByRole("heading",{name:"Pendaftaran diterima"}).waitFor();
  if(attempts!==2||!exactReplay) throw new Error("Retry did not preserve original serialized command");
  checks.push({name:"real-commit-response-loss-replay",grantGet403:true,offlineRetryReachable:true,automaticWrites:0,serverPostAttempts:2,exactBodyAndKey:true});
  await uncertain.unroute("**/api/public/registrations");

  const retry=await visitor(375,812,true);
  await retry.getByRole("button",{name:"Cuba semula borang",exact:true}).waitFor();
  await retry.context().setOffline(true);await retry.evaluate(()=>window.dispatchEvent(new Event("offline")));
  if(!await retry.getByRole("button",{name:"Cuba semula borang",exact:true}).isDisabled()) throw new Error("Offline schema retry bypassed parent gate");
  await retry.context().setOffline(false);await retry.evaluate(()=>window.dispatchEvent(new Event("online")));
  await retry.waitForFunction(()=>!document.querySelector(".qr-bound-form")?.disabled);
  // Observe the explicit retry itself; a scalar status identifies failures without exposing context or schema bodies.
  const schemaRetry=retry.waitForResponse(response=>response.url().endsWith("/api/public/registration-schema")&&response.request().method()==="POST");
  await retry.getByRole("button",{name:"Cuba semula borang",exact:true}).click();
  if((await schemaRetry).status()!==200) throw new Error("Explicit schema retry returned status "+(await schemaRetry).status());
  await retry.getByLabel("Nama penuh").waitFor();
  checks.push({name:"schema-initial503-explicit-retry",originalContextPreserved:true,parentRevalidated:true});
  const retained=await visitor();await retained.getByLabel("Nama penuh").fill("Demo Offline");
  await retained.context().setOffline(true);await retained.evaluate(()=>window.dispatchEvent(new Event("offline")));
  if(!await retained.getByRole("button",{name:"Seterusnya",exact:true}).isDisabled()) throw new Error("Offline ordinary inputs remained enabled");
  await retained.context().setOffline(false);await retained.evaluate(()=>window.dispatchEvent(new Event("online")));
  await retained.waitForFunction(()=>!document.querySelector(".registration-actions button")?.disabled);
  if(await retained.getByLabel("Nama penuh").inputValue()!=="Demo Offline") throw new Error("Offline recovery discarded draft");
  checks.push({name:"ordinary-offline-resume",freshEntryGetRequired:true,draftPreserved:true});
  await retained.setViewportSize({width:375,height:568});
  await retained.evaluate(()=>document.documentElement.style.zoom="2");
  await audit(retained,"identity-short-zoom200","Seterusnya",false);
  // Reachability is about reaching each control, not aligning it with the document end beyond the optional help.
  await retained.getByRole("button",{name:"Seterusnya",exact:true}).focus();
  await retained.locator(".registration-actions").evaluate(element=>element.scrollIntoView({block:"center",behavior:"instant"}));
  const bottomReachable=await retained.getByRole("button",{name:"Seterusnya",exact:true}).evaluate(element=>{
    const box=element.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight+1;
  });
  await retained.locator("h1").evaluate(element=>element.scrollIntoView({block:"start",behavior:"instant"}));
  // CSS zoom aligns fractional pixels to integer scroll offsets; allow the same one-pixel rounding used for bottom bounds.
  const headingReachable=await retained.locator("h1").evaluate(element=>element.getBoundingClientRect().top>=-1);
  const reachable={bottomReachable,headingReachable};
  if(!reachable.bottomReachable||!reachable.headingReachable) throw new Error("Zoom/short-screen controls unreachable "+JSON.stringify(reachable));
  checks.push({name:"zoom200-short-reachability",...reachable,zoom:"CSS simulation; native toolbar NOT_RUN"});
  const long=await visitor();await identity(long,"CONTRACTOR");await visit(long,"CONTRACTOR");
  await long.getByLabel("Tujuan kerja",{exact:true}).fill("A".repeat(500));await review(long);
  await audit(long,"long-purpose-review-mobile375","Hantar pendaftaran");
  const region=long.getByRole("region",{name:"Ringkasan pendaftaran, tatal untuk butiran"});
  await region.focus();await long.keyboard.press("End");
  await long.waitForFunction(()=>document.querySelector(".registration-review-region").scrollTop>0);
  if(!await region.evaluate(element=>element.innerText.includes("A".repeat(500)))) throw new Error("Long purpose was truncated");
  checks.push({name:"long-purpose-keyboard-review",full500CodepointsRetained:true,labelledScrollRegion:true,keyboardBottomReached:true});
  const original=await visitor();await original.getByLabel("Nama penuh").fill("Demo Original Draft");
  const staffCsrf=await (await page.request.get(origin+"/api/public/csrf")).json();
  const secondResponse=await page.request.post(origin+"/api/staff/registration-qr-sessions",{
    data:{counterId:"9007199254741002",categoryScope:null},headers:{[staffCsrf.headerName]:staffCsrf.token},
  });
  if(secondResponse.status()!==201) throw new Error("Owned second-counter QR creation failed");
  const secondId=(await secondResponse.json()).displaySessionId;
  const secondCurrent=await page.request.get(origin+"/api/staff/registration-qr-sessions/"+secondId+"/current");
  const secondQr=await secondCurrent.json();
  if(secondCurrent.status()!==200||typeof secondQr.entryUrl!=="string") throw new Error("Second QR read failed with status "+secondCurrent.status());
  const replacement=await original.context().newPage();await replacement.goto(secondQr.entryUrl);
  await replacement.getByRole("dialog").waitFor();await replacement.getByRole("button",{name:"Mulakan semula",exact:true}).click();
  await replacement.getByLabel("Nama penuh").waitFor();
  await original.evaluate(()=>window.dispatchEvent(new Event("pageshow")));
  await original.getByRole("button",{name:"Buka borang semasa",exact:true}).waitFor();
  if(await original.getByLabel("Nama penuh").inputValue()!=="Demo Original Draft"||!await original.getByRole("button",{name:"Seterusnya",exact:true}).isDisabled()) throw new Error("Cross-tab replacement rebound or enabled old draft");
  await original.getByRole("button",{name:"Buka borang semasa",exact:true}).click();
  await original.waitForFunction(()=>document.querySelector("#registration-fullName")?.value==="");
  checks.push({name:"real-cross-tab-context-replacement",oldDraftRetainedAndDisabled:true,explicitAdoptionStartsEmpty:true,noAutomaticSubmission:true});
  if(errors.length) throw new Error("Unexpected browser exception");
  await page.evaluate(async receipt=>{
    await fetch("http://127.0.0.1:15304/receipt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(receipt)});
  },{checks,responseStatuses:statuses,browserErrors:errors,realBackend:true,realMysql:true,syntheticRecords:true,cameraAndProductionHttps:"NOT_RUN"});
  for(const context of contexts) await context.close();
  return {checks:checks.length,browserErrors:errors.length,realMysql:true,realBackend:true,syntheticRecords:true};
}
