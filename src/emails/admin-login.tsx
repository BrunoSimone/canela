import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render,
  toPlainText,
} from "react-email";

type AdminLoginEmailProps = {
  loginUrl: string;
};

const subject = "Ingresar al panel de pedidos de Canela";

export default function AdminLoginEmail({ loginUrl }: AdminLoginEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tu enlace para entrar al panel de Canela vence en 15 minutos.</Preview>
      <Body style={{ backgroundColor: "#f6efe1", color: "#4a3527", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "32px 12px" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Text style={{ color: "#8a621d", fontSize: "15px", fontWeight: 800, letterSpacing: "0.18em", margin: "0 0 20px" }}>
            CANELA
          </Text>
          <Section style={{ backgroundColor: "#fbf7ee", border: "1px solid #dfd4c1", borderRadius: "8px", padding: "32px" }}>
            <Text style={{ color: "#8a621d", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", margin: "0 0 12px" }}>
              ACCESO AL PANEL
            </Text>
            <Heading as="h1" style={{ color: "#3e3028", fontSize: "28px", lineHeight: "1.2", margin: "0 0 16px" }}>
              Entrá al panel de pedidos
            </Heading>
            <Text style={{ fontSize: "15px", lineHeight: "24px", margin: "0 0 24px" }}>
              Recibimos una solicitud para ingresar al panel de Canela. Usá este enlace para continuar.
            </Text>
            <Button
              href={loginUrl}
              style={{ backgroundColor: "#4a3527", borderRadius: "5px", color: "#ffffff", display: "inline-block", fontSize: "14px", fontWeight: 700, padding: "14px 20px", textDecoration: "none" }}
            >
              Entrar al panel
            </Button>
            <Text style={{ color: "#6e4e38", fontSize: "13px", lineHeight: "20px", margin: "24px 0 8px" }}>
              Si el botón no funciona, copiá esta dirección en tu navegador:
            </Text>
            <Link href={loginUrl} style={{ color: "#6b4d1b", fontSize: "12px", lineHeight: "20px", overflowWrap: "anywhere", wordBreak: "break-all" }}>
              {loginUrl}
            </Link>
            <Hr style={{ borderColor: "#dfd4c1", margin: "28px 0 18px" }} />
            <Text style={{ color: "#6e4e38", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
              El enlace vence en 15 minutos y se puede usar una sola vez. Si no lo solicitaste, podés ignorar este correo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

AdminLoginEmail.PreviewProps = {
  loginUrl: "https://canela.example/admin/acceso?token=preview-token",
} satisfies AdminLoginEmailProps;

export async function renderAdminLoginEmail(props: AdminLoginEmailProps): Promise<{
  subject: string;
  html: string;
  text: string;
}> {
  const html = await render(<AdminLoginEmail {...props} />);
  return { subject, html, text: toPlainText(html) };
}
