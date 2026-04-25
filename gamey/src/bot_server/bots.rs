use crate::{check_api_version, error::ErrorResponse, state::AppState};
use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct BotsParams {
    pub api_version: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct BotInfo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct BotsResponse {
    pub api_version: String,
    pub bots: Vec<BotInfo>,
}

fn bot(id: &str, title: &str, description: &str, tags: &[&str]) -> BotInfo {
    BotInfo {
        id: id.to_string(),
        title: title.to_string(),
        description: description.to_string(),
        tags: tags.iter().map(|t| t.to_string()).collect(),
    }
}

fn known_bots() -> Vec<BotInfo> {
    const BASIC: [&str; 1] = ["basic"];
    const STRATEGY: [&str; 1] = ["strategy"];

    vec![
        bot(
            "side_bot",
            "Facil",
            "Bot sencillo: tiende a jugar cerca de los lados.",
            &BASIC,
        ),
        bot(
            "side_bot_hard",
            "Dificil",
            "Bot mas agresivo: presiona por los lados con mejor criterio.",
            &BASIC,
        ),
        bot(
            "random_bot",
            "Aleatorio",
            "Sin estrategia: elige un movimiento valido al azar.",
            &BASIC,
        ),
        bot(
            "blocker_bot",
            "Bot bloqueador",
            "Prioriza bloquear amenazas inmediatas.",
            &STRATEGY,
        ),
        bot(
            "bridge_bot",
            "Bot puente",
            "Busca conectar regiones y crear puentes.",
            &STRATEGY,
        ),
        bot(
            "center_bot",
            "Bot centro",
            "Prefiere celdas centrales.",
            &STRATEGY,
        ),
        bot(
            "corner_bot",
            "Bot esquinas",
            "Prefiere las esquinas.",
            &STRATEGY,
        ),
        bot(
            "monte_carlo_tree_search_bot",
            "Bot avanzado",
            "Realiza jugadas mas fuertes.",
            &STRATEGY,
        ),
    ]
}

/// Returns a list of available bot ids plus UI-friendly metadata.
///
/// Route: `GET /{api_version}/ybot/bots`
#[axum::debug_handler]
pub async fn bots(
    State(state): State<AppState>,
    Path(params): Path<BotsParams>,
) -> Result<Json<BotsResponse>, Json<ErrorResponse>> {
    check_api_version(&params.api_version)?;

    let available = state.bots().names();
    let bots = known_bots()
        .into_iter()
        .filter(|b| available.iter().any(|n| n == &b.id))
        .collect::<Vec<_>>();

    Ok(Json(BotsResponse {
        api_version: params.api_version,
        bots,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bot_server::create_default_state;

    #[tokio::test]
    async fn returns_default_bots_including_basic_and_strategy() {
        let state = create_default_state();
        let resp = bots(
            State(state),
            Path(BotsParams {
                api_version: "v1".to_string(),
            }),
        )
        .await
        .unwrap();

        let ids = resp.0.bots.iter().map(|b| b.id.as_str()).collect::<Vec<_>>();
        assert!(ids.contains(&"side_bot"));
        assert!(ids.contains(&"side_bot_hard"));
        assert!(ids.contains(&"random_bot"));
        assert!(ids.contains(&"blocker_bot"));
        assert!(ids.contains(&"bridge_bot"));
        assert!(ids.contains(&"center_bot"));
        assert!(ids.contains(&"corner_bot"));
        assert!(ids.contains(&"monte_carlo_tree_search_bot"));
    }
}
