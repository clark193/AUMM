import {useEffect,type RefObject} from "react";

export function useMobileTables(container:RefObject<HTMLDivElement|null>){
 useEffect(()=>{
  const root=container.current;if(!root)return;
  const label=()=>root.querySelectorAll("table").forEach(table=>{
   const headers=Array.from(table.querySelectorAll("thead th"),cell=>cell.textContent?.trim()||"");
   table.classList.add("mobile-responsive-table");
   table.querySelectorAll("tbody tr").forEach(row=>Array.from(row.children).forEach((cell,index)=>{if(cell.tagName==="TD")cell.setAttribute("data-label",headers[index]||"Informação");}));
  });
  label();const observer=new MutationObserver(label);observer.observe(root,{childList:true,subtree:true});return()=>observer.disconnect();
 },[container]);
}
