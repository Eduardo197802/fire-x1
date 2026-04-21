# Plan 006 - URL Publica do Link Administrativo em Producao

## Estrategia
1. Centralizar a resolucao de base URL em uma funcao exportada e testavel.
2. Normalizar URLs configuradas removendo barra final e `www`.
3. Em `NODE_ENV=production`, tratar bases locais como configuracao invalida para e-mail administrativo e aplicar o fallback publico `https://firex1play.com.br`.
4. Manter comportamento local intacto para desenvolvimento.

## Validacao
- Teste unitario focado na funcao de resolucao de base URL.
- Execucao do arquivo de teste novo via Jest.
