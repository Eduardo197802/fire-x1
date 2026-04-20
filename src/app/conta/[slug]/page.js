import { notFound } from "next/navigation";
import ContaPageClient from "./ContaPageClient";

const pages = {
  "meu-perfil": {
    title: "Meu perfil",
    description: "Resumo da sua conta Fire X1 com acesso rápido para atualização de dados.",
    action: "Editar dados"
  },
  "adicionar-fundo": {
    title: "Adicionar fundo",
    description: "Aqui você pode preparar seu saldo para novas disputas e operações.",
    action: "Gerar depósito"
  },
  "minha-fatura": {
    title: "Minha fatura",
    description: "Acompanhe cobranças, histórico de pagamentos e comprovantes da conta.",
    action: "Ver histórico"
  },
  "meu-email": {
    title: "Meu e-mail",
    description: "Gerencie o e-mail principal e preferências de comunicação da plataforma.",
    action: "Atualizar e-mail"
  },
  assinatura: {
    title: "Assinatura",
    description: "Visualize seu plano, status de renovação e detalhes da assinatura ativa.",
    action: "Gerenciar assinatura"
  },
  sacar: {
    title: "Sacar fundo",
    description: "Transfira seu saldo de volta para sua conta via PIX.",
    action: "Solicitar saque"
  }
};

export default async function ContaPage({ params }) {
  const resolvedParams = await params;
  const key = resolvedParams?.slug;
  const page = pages[key];

  if (!page) {
    notFound();
  }

  return <ContaPageClient pageKey={key} page={page} />;
}
