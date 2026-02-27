# Generic Ecological Inference Script
# This script is designed to be data-agnostic, using a configuration list
# instead of hardcoded column names or specific political parties.

library(eiPack)
library(data.table)
library(jsonlite)

run_generic_ei <- function(data_source, data_target, config) {
  # 1. Reshape source data
  votes_src <- dcast(as.data.table(data_source), 
                    get(config$id_col) + get(config$electorate_col) ~ get(config$party_col), 
                    value.var = "votos", fill = 0)
  setnames(votes_src, c("circuitoId", "electorate_src", config$src_parties))
  
  # 2. Reshape target data
  votes_tgt <- dcast(as.data.table(data_target), 
                    get(config$id_col) + get(config$electorate_col) ~ get(config$party_col), 
                    value.var = "votos", fill = 0)
  setnames(votes_tgt, c("circuitoId", "electorate_tgt", config$tgt_parties))
  
  # 3. Merge
  merged <- merge(votes_src, votes_tgt, by = "circuitoId")
  
  # 4. Filter stable circuits
  merged <- merged[
    electorate_tgt <= (1 + config$tolerance) * electorate_src &
    electorate_tgt >= (1 - config$tolerance) * electorate_src
  ]
  
  # 5. Calculate proportions for X matrix (source)
  for (i in seq_along(config$src_parties)) {
    merged[[paste0("x", i)]] <- merged[[config$src_parties[i]]] / merged$electorate_src
  }
  
  # 6. Calculate proportions for T matrix (target)
  for (j in seq_along(config$tgt_parties)) {
    merged[[paste0("t", j)]] <- merged[[config$tgt_parties[j]]] / merged$electorate_src
  }
  
  # 7. Formula dynamic generation
  x_cols <- paste0("x", 1:length(config$src_parties))
  t_cols <- paste0("t", 1:length(config$tgt_parties))
  
  formula_str <- paste0("cbind(", paste(t_cols, collapse = ","), ") ~ cbind(", 
                        paste(x_cols, collapse = ","), ")")
  formula_ei <- as.formula(formula_str)
  
  # 8. Run Inference
  # (Using faster settings for demonstration)
  ei_result <- BayesMDei(formula_ei, data = merged, total = "electorate_src",
                        burnin = 1000, mcmc = 5000, thin = 1)
  
  return(ei_result)
}

# Example Config Object
# config <- list(
#   id_col = "circuitoId",
#   electorate_col = "cantidadElectores",
#   party_col = "nombreAgrupacion",
#   src_parties = c("UxP", "LLA", "JxC", "OTROS", "EN_BLANCO", "NO_VOTANTES"),
#   tgt_parties = c("FP", "LLA", "OTROS", "EN_BLANCO", "NO_VOTANTES"),
#   tolerance = 0.15
# )
