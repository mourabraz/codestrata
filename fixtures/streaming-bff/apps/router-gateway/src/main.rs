//! Thin gateway in front of the Apollo Router.
//! Keeps the legacy BFF path (`/api`) working and resolves persisted query ids
//! before forwarding to the router.

use std::collections::HashMap;
use std::env;

/// Maps a legacy request path to the router endpoint.
fn route(path: &str) -> Option<&'static str> {
    match path {
        "/api" | "/graphql" => Some("/"),
        _ => None,
    }
}

/// Persisted query ids are the sha256 of the operation document, as in the BFF.
fn resolve_persisted_query<'a>(store: &'a HashMap<String, String>, id: &str) -> Option<&'a String> {
    store.get(id)
}

fn main() {
    let router_url = env::var("ROUTER_URL").unwrap_or_else(|_| "http://localhost:4200".to_string());
    let store: HashMap<String, String> = HashMap::new();
    println!("router-gateway forwarding to {router_url}");
    println!("/api -> {:?}", route("/api"));
    println!("unknown id -> {:?}", resolve_persisted_query(&store, "missing"));
}
