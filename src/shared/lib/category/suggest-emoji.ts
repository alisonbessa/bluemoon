/**
 * Suggest an emoji icon based on category name keywords
 * Supports Brazilian Portuguese category names
 */
export function suggestEmojiForCategory(name: string): string {
  const lowerName = name.toLowerCase();

  // Food & Drinks
  if (lowerName.includes("mercado") || lowerName.includes("supermercado") || lowerName.includes("feira")) return "🛒";
  if (lowerName.includes("restaurante") || lowerName.includes("comida") || lowerName.includes("almoço") || lowerName.includes("jantar")) return "🍽️";
  if (lowerName.includes("café") || lowerName.includes("coffee")) return "☕";
  if (lowerName.includes("padaria") || lowerName.includes("pão")) return "🥖";
  if (lowerName.includes("açougue") || lowerName.includes("carne")) return "🥩";
  if (lowerName.includes("delivery") || lowerName.includes("ifood")) return "🛵";
  if (lowerName.includes("bar") || lowerName.includes("cerveja") || lowerName.includes("bebida")) return "🍺";

  // Housing
  if (lowerName.includes("aluguel") || lowerName.includes("moradia")) return "🏠";
  if (lowerName.includes("condomínio") || lowerName.includes("condominio")) return "🏢";
  if (lowerName.includes("água") || lowerName.includes("agua")) return "💧";
  if (lowerName.includes("luz") || lowerName.includes("energia") || lowerName.includes("eletricidade")) return "💡";
  if (lowerName.includes("gás") || lowerName.includes("gas")) return "🔥";
  if (lowerName.includes("internet") || lowerName.includes("wifi")) return "📶";
  if (lowerName.includes("telefone") || lowerName.includes("celular")) return "📱";
  if (lowerName.includes("limpeza") || lowerName.includes("faxina")) return "🧹";
  if (lowerName.includes("móveis") || lowerName.includes("moveis") || lowerName.includes("decoração")) return "🛋️";

  // Transport
  if (lowerName.includes("uber") || lowerName.includes("99") || lowerName.includes("taxi") || lowerName.includes("corrida")) return "🚗";
  if (lowerName.includes("combustível") || lowerName.includes("combustivel") || lowerName.includes("gasolina") || lowerName.includes("etanol")) return "⛽";
  if (lowerName.includes("estacionamento")) return "🅿️";
  if (lowerName.includes("ônibus") || lowerName.includes("onibus") || lowerName.includes("metrô") || lowerName.includes("metro") || lowerName.includes("transporte")) return "🚌";
  if (lowerName.includes("ipva") || lowerName.includes("licenciamento") || lowerName.includes("seguro carro")) return "🚙";
  if (lowerName.includes("manutenção") || lowerName.includes("manutencao") || lowerName.includes("oficina") || lowerName.includes("mecânico")) return "🔧";

  // Health
  if (lowerName.includes("academia") || lowerName.includes("gym") || lowerName.includes("musculação")) return "💪";
  if (lowerName.includes("médico") || lowerName.includes("medico") || lowerName.includes("consulta") || lowerName.includes("saúde") || lowerName.includes("saude")) return "🏥";
  if (lowerName.includes("farmácia") || lowerName.includes("farmacia") || lowerName.includes("remédio") || lowerName.includes("remedio")) return "💊";
  if (lowerName.includes("dentista") || lowerName.includes("dente")) return "🦷";
  if (lowerName.includes("psicólogo") || lowerName.includes("psicologo") || lowerName.includes("terapia") || lowerName.includes("terapeuta")) return "🧠";
  if (lowerName.includes("plano de saúde") || lowerName.includes("plano saude")) return "🏥";

  // Entertainment
  if (lowerName.includes("netflix") || lowerName.includes("streaming") || lowerName.includes("hbo") || lowerName.includes("disney") || lowerName.includes("prime")) return "📺";
  if (lowerName.includes("spotify") || lowerName.includes("música") || lowerName.includes("musica") || lowerName.includes("deezer")) return "🎵";
  if (lowerName.includes("cinema") || lowerName.includes("filme")) return "🎬";
  if (lowerName.includes("teatro") || lowerName.includes("show") || lowerName.includes("evento")) return "🎭";
  if (lowerName.includes("viagem") || lowerName.includes("férias") || lowerName.includes("ferias") || lowerName.includes("passagem")) return "✈️";
  if (lowerName.includes("hotel") || lowerName.includes("hospedagem") || lowerName.includes("airbnb")) return "🏨";
  if (lowerName.includes("livro") || lowerName.includes("kindle") || lowerName.includes("leitura")) return "📚";
  if (lowerName.includes("jogo") || lowerName.includes("game") || lowerName.includes("playstation") || lowerName.includes("xbox")) return "🎮";

  // Shopping & Personal
  if (lowerName.includes("roupa") || lowerName.includes("vestuário") || lowerName.includes("vestuario") || lowerName.includes("moda")) return "👕";
  if (lowerName.includes("calçado") || lowerName.includes("calcado") || lowerName.includes("sapato") || lowerName.includes("tênis")) return "👟";
  if (lowerName.includes("beleza") || lowerName.includes("salão") || lowerName.includes("salao") || lowerName.includes("cabelo") || lowerName.includes("manicure")) return "💅";
  if (lowerName.includes("presente") || lowerName.includes("gift")) return "🎁";
  if (lowerName.includes("pet") || lowerName.includes("cachorro") || lowerName.includes("cão") || lowerName.includes("cao")) return "🐕";
  if (lowerName.includes("gato")) return "🐱";

  // Education
  if (lowerName.includes("escola") || lowerName.includes("faculdade") || lowerName.includes("curso") || lowerName.includes("educação") || lowerName.includes("educacao")) return "📖";
  if (lowerName.includes("material escolar") || lowerName.includes("papelaria")) return "✏️";
  if (lowerName.includes("inglês") || lowerName.includes("ingles") || lowerName.includes("idioma")) return "🌍";

  // Finance
  if (lowerName.includes("investimento") || lowerName.includes("poupança") || lowerName.includes("poupanca") || lowerName.includes("reserva")) return "💰";
  if (lowerName.includes("cartão") || lowerName.includes("cartao") || lowerName.includes("crédito") || lowerName.includes("credito")) return "💳";
  if (lowerName.includes("imposto") || lowerName.includes("ir") || lowerName.includes("iptu")) return "🧾";
  if (lowerName.includes("seguro")) return "🛡️";
  if (lowerName.includes("doação") || lowerName.includes("doacao") || lowerName.includes("caridade")) return "❤️";

  // Kids
  if (lowerName.includes("filho") || lowerName.includes("filha") || lowerName.includes("criança") || lowerName.includes("crianca") || lowerName.includes("bebê") || lowerName.includes("bebe")) return "👶";
  if (lowerName.includes("brinquedo")) return "🧸";
  if (lowerName.includes("fralda")) return "🍼";

  // Work
  if (lowerName.includes("trabalho") || lowerName.includes("office") || lowerName.includes("escritório") || lowerName.includes("escritorio")) return "💼";
  if (lowerName.includes("equipamento") || lowerName.includes("computador") || lowerName.includes("notebook")) return "💻";

  // Default
  return "📌";
}
