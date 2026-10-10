// Diagnostic layout script reports only geometry and synthetic empty-form screenshots, never capabilities.
/* eslint-disable no-unused-expressions -- Playwright CLI invokes the function expression. */
async (page) => {
  const target=page.context().browser().contexts().flatMap(context=>context.pages()).filter(target=>target.url().endsWith("/register")).at(-1);
  if(!target) throw new Error("Owned visitor page unavailable");
  await target.screenshot({path:"output/playwright/m03-registration/layout-current.png",fullPage:true});
  return target.evaluate(()=>[".visitor-brand",".qr-entry>h1",".qr-entry-card",".qr-live",".qr-entry-card>h2",".registration-demo",
    ".registration-step",".registration-form h3",".registration-form>.field",".registration-fields",".registration-actions",".qr-entry-help"].map(selector=>{
    const element=document.querySelector(selector),box=element?.getBoundingClientRect(),style=element?getComputedStyle(element):null;
    return {selector,top:box?.top,height:box?.height,marginTop:style?.marginTop,marginBottom:style?.marginBottom,padding:style?.padding,fontSize:style?.fontSize};
  }));
}
