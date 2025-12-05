# Ideias Futuras e Melhorias

Este arquivo registra ideias para implementacao futura, sugestoes de usuarios e melhorias planejadas.

---

## Metas

### Fluxo de Transacoes para Metas
- **Ideia**: Integrar metas no fluxo de transacoes existente
- **Como funcionaria**: No modal de transacao, ao escolher tipo "Despesa", mostrar hierarquia:
  1. Selecionar Grupo (Essencial, Estilo de Vida, Prazeres, **Metas**)
  2. Se grupo = Metas, mostrar lista de metas ativas
  3. Depois selecionar categoria dentro da meta (opcional)
- **Beneficio**: Reutiliza UI existente, usuario ja conhece o fluxo
- **Consideracao**: Pode ficar verboso. Testar com usuarios primeiro.

### Categorias dentro de Metas
- **Ideia**: Metas podem ter sub-categorias para organizar gastos
- **Exemplo**: Meta "Viagem Disney" com categorias: Passagens, Hotel, Ingressos, Alimentacao
- **Status**: Para v2, comecar simples com valor unico por meta

---

## Dashboard

### Substituir "Acoes Rapidas"
- **Ideia**: Card de acoes rapidas nao esta sendo muito util
- **Sugestao**: Substituir por resumo de metas com progresso
- **Layout**: Cards pequenos mostrando % de cada meta ativa

---

## Transacoes

### Melhorar fluxo de categorizacao
- **Ideia**: Hierarquia Grupo > Categoria no modal
- **Status**: Avaliar apos implementar metas

---

## UX Geral

### Celebracoes
- **Ideia**: Animacoes/confetti quando usuario atinge marcos
- **Casos de uso**:
  - Meta 100% completa
  - Primeira meta criada
  - Mes fechado dentro do orcamento
- **Status**: Implementar versao simples primeiro, melhorar depois

---

## Notas de Feedback de Usuarios

(Adicionar feedback aqui conforme recebido)

---

*Ultima atualizacao: Dezembro 2025*
