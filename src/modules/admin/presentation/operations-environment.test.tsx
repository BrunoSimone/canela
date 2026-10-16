import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {ShipmentActions} from "./shipment-actions";
import {OrderOperations} from "./order-operations";
import {PreparationEditor} from "./preparation-editor";
import {demoOrderById} from "../infrastructure/demo-orders";
import type {AdminOrder} from "../domain/order";
const fixture=demoOrderById("11111111-1111-4111-8111-111111111111")!;
function order(environment:"test"|"production"):AdminOrder{return {...fixture,environment,source:"database",status:"label_ready",shipmentEnabled:true,shipment:{state:"label_ready",lastError:null,remoteId:12,trackingUrl:"https://tracking.example.com/12",trackingNumber:null,sandbox:environment==="test"}};}
describe("OPS-07 visible environment and dispatch safeguards",()=>{
 it("keeps a courier order in one box and never pre-fills estimated dimensions as measured",()=>{
  const o:AdminOrder={...order("test"),status:"prepare",preparation:null,shipment:null,packingPlan:[{weightGrams:1000,heightCm:10,widthCm:20,lengthCm:20,items:[],groupingRule:null}]};
  const html=renderToStaticMarkup(<PreparationEditor order={o} demo={false} onSaved={()=>{}}/>);
  expect(html).not.toContain("Agregar bulto");expect(html).not.toContain('value="1000"');expect(html).toContain("Guardar preparación");
 });
 it("does not label a live shipment as a test merely because fulfillment is enabled",()=>{
  const html=renderToStaticMarkup(<ShipmentActions order={order("production")} onChanged={()=>{}}/>);
  expect(html).not.toContain("Modo de pruebas");expect(html).toContain("Descargar etiqueta PDF");
 });
 it("marks sandbox before and after shipment creation",()=>{
  const o=order("test");expect(renderToStaticMarkup(<ShipmentActions order={o} onChanged={()=>{}}/>)).toContain("Modo de pruebas");
  expect(renderToStaticMarkup(<ShipmentActions order={{...o,shipment:null}} onChanged={()=>{}}/>)).toContain("Modo de pruebas");
 });
 it.each(["test","production"] as const)("requires explicit confirmation for %s dispatch",environment=>{
  const html=renderToStaticMarkup(<OrderOperations order={order(environment)} onChanged={()=>{}}/>);
  expect(html).toMatch(/<button[^>]+disabled=""[^>]*>/);expect(html).toContain(environment==="test"?"Simular despacho":"Registrar despacho");
 });
});
