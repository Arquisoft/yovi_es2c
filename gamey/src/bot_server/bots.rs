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

fn known_bots() -> Vec<BotInfo> {
    vec![
        BotInfo {
            id: "side_bot".to_string(),
            title: "Facil".to_string(),
            description: "Bot sencillo: tiende a jugar cerca de los lados.".to_string(),
            tags: vec!["basic".to_string()],
        },
        BotInfo {
            id: "side_bot_hard".to_string(),
            title: "Dificil".to_string(),
            description: "Bot mas agresivo: presiona por los lados con mejor criterio.".to_string(),
            tags: vec!["basic".to_string()],
        },
        BotInfo {
            id: "random_bot".to_string(),
            title: "Aleatorio".to_string(),
            description: "Sin estrategia: elige un movimiento valido al azar.".to_string(),
            tags: vec!["basic".to_string()],
        },
        BotInfo {
            id: "blocker_bot".to_string(),
            title: "Bot bloqueador".to_string(),
            description: "Prioriza bloquear amenazas inmediatas.".to_string(),
            tags: vec!["strategy".to_string()],
        },
        BotInfo {
            id: "bridge_bot".to_string(),
            title: "Bot puente".to_string(),
            description: "Busca conectar regiones y crear puentes.".to_string(),
            tags: vec!["strategy".to_string()],
        },
        BotInfo {
            id: "center_bot".to_string(),
            title: "Bot centro".to_string(),
            description: "Prefiere celdas centrales.".to_string(),
            tags: vec!["strategy".to_string()],
        },
        BotInfo {
            id: "corner_bot".to_string(),
            title: "Bot esquinas".to_string(),
            description: "Prefiere las esquinas.".to_string(),
            tags: vec!["strategy".to_string()],
        },
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
    }
}

