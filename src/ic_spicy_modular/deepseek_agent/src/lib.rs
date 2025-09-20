use ic_cdk::api::{self, management_canister::http_request::{http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse, TransformArgs, TransformContext}};
use ic_cdk_macros::{query, update, pre_upgrade, post_upgrade};
use std::cell::RefCell;

thread_local! {
    static API_KEY: RefCell<Option<String>> = RefCell::new(None);
    static GATEWAY_URL: RefCell<Option<String>> = RefCell::new(None);
}

#[query]
pub fn greet() -> String {
    "AI agent ready (Cloudflare gateway supported)".to_string()
}

#[update]
pub fn set_api_key(key: String) -> String {
    API_KEY.with(|k| {
        *k.borrow_mut() = Some(key);
    });
    "ok".to_string()
}

#[query]
pub fn has_api_key() -> bool {
    API_KEY.with(|k| k.borrow().is_some())
}

#[update]
pub fn set_gateway_url(url: String) -> String {
    GATEWAY_URL.with(|u| {
        *u.borrow_mut() = Some(url);
    });
    "ok".to_string()
}

#[update]
pub fn clear_gateway_url() -> String {
    GATEWAY_URL.with(|u| {
        *u.borrow_mut() = None;
    });
    "ok".to_string()
}

#[query]
pub fn get_gateway_url() -> Option<String> {
    GATEWAY_URL.with(|u| u.borrow().clone())
}

#[update]
pub async fn ask_deepseek(question: String) -> String {
    // Prefer Cloudflare gateway if configured
    if let Some(gateway) = GATEWAY_URL.with(|u| u.borrow().clone()) {
        let body_json = format!("{{\"question\":\"{}\"}}", question.replace('"', "\\\""));
        let headers = vec![HttpHeader { name: "Content-Type".into(), value: "application/json".into() }];
        let req = CanisterHttpRequestArgument {
            url: gateway,
            max_response_bytes: Some(128 * 1024),
            method: HttpMethod::POST,
            headers,
            body: Some(body_json.into_bytes()),
            transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
        };
        return match http_request(req, 20_000_000_000).await {
            Ok((resp,)) => String::from_utf8_lossy(&resp.body).to_string(),
            Err((code, msg)) => format!("[gateway] https error: {:?}: {}", code, msg),
        };
    }

    // No gateway configured: do NOT call upstream directly to avoid replica divergence
    "Gateway not configured. Call this canister via a Cloudflare Worker gateway or use the frontend browser gateway.".to_string()
}

#[query]
fn transform(raw: TransformArgs) -> HttpResponse {
    let body_str = String::from_utf8_lossy(&raw.response.body);
    let mut content = extract_answer(&body_str).unwrap_or_else(|| body_str.to_string());
    content = content.replace("\r\n", "\n");
    HttpResponse { status: raw.response.status, body: content.into_bytes(), headers: vec![], ..Default::default() }
}

fn extract_answer(body: &str) -> Option<String> {
    let choices_idx = body.find("\"choices\"")?;
    let after = &body[choices_idx..];
    let msg_idx = after.find("\"message\"")?;
    let after_msg = &after[msg_idx..];
    let content_key = "\"content\"";
    let content_idx = after_msg.find(content_key)?;
    let after_content = &after_msg[content_idx + content_key.len()..];
    let first_quote = after_content.find('"')?;
    let rest = &after_content[first_quote + 1..];
    let mut out = String::new();
    for ch in rest.chars() { if ch == '"' { break; } out.push(ch); }
    if out.is_empty() { None } else { Some(out) }
}

#[pre_upgrade]
fn pre_upgrade() {
    let key = API_KEY.with(|k| k.borrow().clone());
    let gw = GATEWAY_URL.with(|u| u.borrow().clone());
    ic_cdk::storage::stable_save((key, gw)).ok();
}

#[post_upgrade]
fn post_upgrade() {
    let (saved_key, saved_gw): (Option<String>, Option<String>) = ic_cdk::storage::stable_restore().unwrap_or((None, None));
    API_KEY.with(|k| *k.borrow_mut() = saved_key);
    GATEWAY_URL.with(|u| *u.borrow_mut() = saved_gw);
}

candid::export_service!();
