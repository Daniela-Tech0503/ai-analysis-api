# Level Wellness AI Cost Studio

Um assistente inteligente com interface estilo ChatGPT para analisar, comparar e planear estratégias de custos e performance de modelos de LLM (Large Language Models), suportado por dados em tempo real da Artificial Analysis e gerado pelo modelo DeepSeek. 

Este projeto foi construído para ser Vercel-first, focando em baixa latência e persistência rápida.

![Screenshot da Aplicação](https://via.placeholder.com/1200x600.png?text=Level+Wellness+AI+Cost+Studio) <!-- Pode substituir esta imagem por um print real da aplicação -->

## ✨ Funcionalidades

- **Interface de Chat Avançada**: Design UI/UX moderno que simula a experiência do ChatGPT com dark mode embutido e layout responsivo.
- **Contexto de Dados Externos**: Integração com a API da [Artificial Analysis](https://artificialanalysis.ai/) para injetar automaticamente no prompt do LLM os dados atualizados sobre custos (Tokens, blended pricing) e performance (Tokens/s, Time to first token) dos vários modelos do mercado.
- **Persistência de Conversas**: Usa o **Vercel KV (Upstash Redis)** para armazenar sessões de chat de forma persistente. Se as variáveis do KV não estiverem ativas (por exemplo, em desenvolvimento local offline), o sistema recorre graciosamente a um armazenamento temporário em memória RAM.
- **Gestor de Sessões (Threads)**: Criação de múltiplas sessões, histórico de conversas na barra lateral e fácil navegação entre tópicos.
- **DeepSeek LLM**: Usa o `deepseek-chat` como motor de raciocínio, configurado para respostas focadas e objetivas em contexto de engenharia e operações.

## 🛠️ Tech Stack

- **Frontend:** [Next.js 16](https://nextjs.org/) (App Router), React 19
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Componentes UI:** [Radix UI](https://www.radix-ui.com/) e [shadcn/ui](https://ui.shadcn.com/) (Botões, ScrollArea, Dialog, Textarea)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Backend:** Next.js API Routes (Serverless Functions em `/api/chat`, `/api/threads`)
- **Base de Dados:** [Upstash Redis](https://upstash.com/) (Vercel KV)
- **Integração AI:** [OpenAI Node SDK](https://github.com/openai/openai-node) (configurado para a API da DeepSeek)

## 🚀 Setup e Instalação Local

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/Daniela-Tech0503/ai-analysis-api.git
   cd ai-analysis-api
   ```

2. **Instalar dependências**
   Este projeto utiliza `npm`.
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente**
   Crie um ficheiro `.env.local` na raiz do projeto e configure as seguintes chaves com base no ficheiro de exemplo `.env.example`:

   ```env
   # DeepSeek (LLM Provider)
   DEEPSEEK_API_BASE=https://api.deepseek.com
   DEEPSEEK_API_KEY=sk-sua-chave-aqui
   DEEPSEEK_MODEL=deepseek-chat

   # Artificial Analysis (Data Context)
   AI_ANALYSIS_API_URL=https://artificialanalysis.ai/api/v2/data/llms/models
   AI_ANALYSIS_API_KEY=sua-chave-api-aqui
   AI_ANALYSIS_API_AUTH_HEADER=x-api-key

   # Vercel KV (Opcional localmente, Obrigatório em Produção para persistência)
   # Caso estas chaves não sejam fornecidas, a app usa Fallback em RAM.
   KV_REST_API_URL=https://sua-url-upstash.upstash.io
   KV_REST_API_TOKEN=seu-token-upstash
   ```

4. **Executar o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

## ☁️ Deploy (Vercel)

Esta aplicação foi desenhada de raiz para fazer deploy diretamente na **Vercel**. 

1. Faça Login na Vercel CLI (`npx vercel login`) ou associe o seu repositório no Dashboard da Vercel.
2. Certifique-se que adiciona todas as chaves referidas acima nas `Environment Variables` do seu projeto Vercel (definições do projeto > Environment Variables).
3. Faça o Deploy com:
   ```bash
   npx vercel --prod
   ```
   *Nota: O backend foi migrado de FastAPI (Python) para API Routes nativas do Next.js (TypeScript), contornando limitações de tamanho de bundle e falhas de inicialização do ambiente serverless.*

## 📂 Estrutura de Diretórios Principal

- `/app`: Configurações de layout (`layout.tsx`), página principal (`page.tsx`) e lógica de backend Serverless em `/app/api/...`.
- `/components`: Contém os ficheiros vitais da interface, como `chat-shell.tsx` e `chat-message.tsx`, bem como componentes genéricos baseados em shadcn (`/components/ui/`).
- `/lib`: Utilitários e helpers importantes, incluindo as definições de Tipos TypeScript (`types.ts`), o cliente Redis (`redis.ts`) e o gestor de estado da API (`store.ts`).

## 🛡️ Contribuição

Sinta-se livre para abrir issues ou submeter *pull requests*. Para mudanças de grande escala, por favor abra primeiro uma issue para discutir o que pretende mudar.