import ConfirmacaoClient from "./ConfirmacaoClient";

export default async function ConfirmacaoPage({ searchParams }) {
  const query = await searchParams;
  const initialUserId = Number(query?.user || 0);

  return <ConfirmacaoClient initialUserId={initialUserId} />;
}
