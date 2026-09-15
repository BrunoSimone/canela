import { CheckoutResult } from "@/modules/checkout/presentation/components/checkout-result";

export const dynamic = "force-dynamic";

export default async function CheckoutResultPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  return <CheckoutResult publicToken={publicToken} />;
}
