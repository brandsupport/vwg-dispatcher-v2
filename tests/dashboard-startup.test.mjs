import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function makeNode(dataset={}) {
  return {
    dataset,
    style:{},
    classList:{add(){},remove(){},toggle(){}},
    listeners:new Map(),
    innerHTML:"",
    textContent:"",
    value:"",
    title:"",
    disabled:false,
    hidden:false,
    addEventListener(type,callback){
      const list=this.listeners.get(type)||[];
      list.push(callback);
      this.listeners.set(type,list);
    },
    focus(){},
    scrollIntoView(){},
    click(){},
    appendChild(){},
    remove(){},
    setAttribute(){},
    getAttribute(){return null;},
    closest(){return null;},
    querySelector(){return makeNode();},
    querySelectorAll(){return [];}
  };
}

test("dashboard starts with the Overview rendered and navigation handlers attached",()=>{
  const nodes=new Map();
  const pageContent=makeNode();
  const activeViews=[
    "overview","live","tickets","email","brands","workflow","team","roster","audit","reports"
  ];
  const navNodes=activeViews.map(view=>makeNode({view}));
  const document={
    getElementById(id){
      if(id==="pageContent")return pageContent;
      if(!nodes.has(id))nodes.set(id,makeNode());
      return nodes.get(id);
    },
    querySelectorAll(selector){
      return selector===".nav-item"?navNodes:[];
    },
    addEventListener(){},
    createElement(){return makeNode();}
  };
  const context={
    document,
    window:{innerWidth:1280,scrollTo(){}},
    pageContent,
    toast:document.getElementById("toast"),
    modalRoot:document.getElementById("modalRoot"),
    console,
    setTimeout,
    clearTimeout,
    Blob,
    URL,
    Intl,
    Date,
    navigator:{}
  };
  vm.createContext(context);
  const source=fs.readFileSync(new URL("../dashboard.js",import.meta.url),"utf8");

  assert.doesNotThrow(()=>vm.runInContext(source,context,{filename:"dashboard.js"}));

  assert.equal(pageContent.dataset.view,"overview");
  assert.ok(pageContent.innerHTML.length>1000,"initial dashboard content must replace the loading placeholder");
  assert.equal(document.getElementById("topbarPage").textContent,"Overview");
  assert.deepEqual(navNodes.map(node=>node.dataset.view),activeViews,
    "startup fixture must represent the ten active reporting workspaces");
  assert.ok(navNodes.every(node=>(node.listeners.get("click")||[]).length===1),
    "all active navigation buttons must receive click handlers");
  assert.equal((document.getElementById("importSnapshotButton").listeners.get("click")||[]).length,1);
  assert.equal((document.getElementById("snapshotFileInput").listeners.get("change")||[]).length,1);
});
