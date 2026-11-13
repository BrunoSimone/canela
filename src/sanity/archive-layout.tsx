import type { LayoutProps } from 'sanity';
export function ArchiveLayout(props: LayoutProps) {
  return <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
    <div style={{padding:'12px 20px',background:'#f6ead2',color:'#493629',fontFamily:'sans-serif',fontSize:14}}>
      Este catálogo se conserva como respaldo. Para editar productos y cantidades, usá{' '}
      <a href="https://www.canela-store.com/admin/catalogo" style={{fontWeight:700,color:'inherit'}}>el panel de Canela</a>.
    </div>
    <div style={{flex:1,minHeight:0}}>{props.renderDefault(props)}</div>
  </div>;
}
