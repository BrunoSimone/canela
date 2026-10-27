import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, render, toPlainText } from "react-email";
export type OrderNoticeProps={frameProductionDays?:number;kind:"owner_paid"|"buyer_shipped";reference:string;test:boolean;actionUrl:string;carrier:string|null;trackingNumber:string|null;totalCents:number;items:{name:string;quantity:number}[]};
export default function OrderNoticeEmail(props:OrderNoticeProps){
  const owner=props.kind==="owner_paid";
  return <Html lang="es"><Head/><Preview>{owner?"Hay un pedido pagado para preparar.":"Tu pedido fue entregado al transporte."}</Preview>
    <Body style={{backgroundColor:"#f6efe1",color:"#4a3527",fontFamily:"Arial, Helvetica, sans-serif",margin:0,padding:"32px 12px"}}>
      <Container style={{maxWidth:"560px",margin:"0 auto"}}>
        <Text style={{color:"#8a621d",fontWeight:800,letterSpacing:"0.18em"}}>CANELA</Text>
        <Section style={{backgroundColor:"#fbf7ee",border:"1px solid #dfd4c1",borderRadius:"8px",padding:"32px"}}>
          {props.test&&<Text style={{fontWeight:700}}>PRUEBA — Este correo corresponde a una simulación. No hay un despacho real.</Text>}
          <Heading as="h1" style={{fontSize:"28px",lineHeight:"1.2"}}>{owner?"Nuevo pedido pagado":"Tu pedido fue despachado"}</Heading>
          <Text>Pedido {props.reference}</Text>
          {owner?<><Text>{props.frameProductionDays ? `El pago del cuadro está confirmado. Abrí el diseño y su guía de armado en el panel. El plazo indicado de fabricación es de ${props.frameProductionDays} días; el envío se prepara cuando esté terminado.` : "El pago está confirmado. Podés preparar las piezas y revisar el envío desde el panel."}</Text>
            {props.items.map((item,index)=><Text key={index}>{item.quantity} × {item.name}</Text>)}
            <Text>Total: {new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(props.totalCents/100)}</Text></>:
            <><Text>El taller registró la entrega de tu paquete a {props.carrier??"el transporte"}. Las novedades del recorrido se consultan en su seguimiento.</Text>
            {props.trackingNumber&&<Text>Número de seguimiento: {props.trackingNumber}</Text>}</>}
          <Button href={props.actionUrl} style={{backgroundColor:"#4a3527",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:700,padding:"14px 20px",textDecoration:"none"}}>{owner?"Ver pedido":"Seguir mi envío"}</Button>
          <Text style={{fontSize:"12px",overflowWrap:"anywhere"}}>{props.actionUrl}</Text>
        </Section>
      </Container>
    </Body></Html>;
}
OrderNoticeEmail.PreviewProps={kind:"buyer_shipped",reference:"ID 1234ABCD",test:true,actionUrl:"https://example.com/seguimiento",carrier:"OCA",trackingNumber:"PRUEBA123",totalCents:4260000,items:[{name:"Pieza de prueba",quantity:1}]} satisfies OrderNoticeProps;
export async function renderOrderNotice(props:OrderNoticeProps){
  const html=await render(<OrderNoticeEmail {...props}/>);
  return {subject:`${props.test?"[PRUEBA] ":""}${props.kind==="owner_paid"?"Nuevo pedido pagado":"Tu pedido fue despachado"} · ${props.reference} · Canela`,html,text:toPlainText(html)};
}
