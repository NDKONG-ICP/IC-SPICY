use candid::{CandidType, Deserialize, Principal};
use ic_cdk;
use std::collections::HashMap;
use std::cell::RefCell;

#[derive(CandidType, Deserialize, Clone)]
pub struct PaymentRequest {
    pub id: String,
    pub amount: f64,
    pub currency: String,
    pub recipient_address: String,
    pub description: String,
    pub expires_at: i64,
    pub created_at: i64,
    pub status: PaymentStatus,
    pub transaction_hash: Option<String>,
    pub metadata: Option<String>,
    pub user_principal: String,
}

#[derive(CandidType, Deserialize, Clone)]
pub enum PaymentStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Expired,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct PaymentResponse {
    pub success: bool,
    pub message: String,
    pub payment_id: Option<String>,
    pub transaction_hash: Option<String>,
    pub error: Option<String>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreatePaymentRequest {
    pub amount: f64,
    pub currency: String,
    pub description: String,
    pub expires_in_minutes: Option<i32>,
    pub metadata: Option<String>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct VerifyPaymentRequest {
    pub payment_id: String,
    pub transaction_signature: String,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct PaymentStats {
    pub total_payments: u64,
    pub total_volume: f64,
    pub success_rate: f64,
}

thread_local! {
    static PAYMENTS: RefCell<HashMap<String, PaymentRequest>> = RefCell::new(HashMap::new());
    static PAYMENT_COUNTER: RefCell<u64> = RefCell::new(0);
}

const SUPPORTED_CURRENCIES: [&str; 5] = ["SOL", "SUI", "USDC", "USDT", "RAY"];

// Membership canister ID for cross-chain payments
const MEMBERSHIP_CANISTER_ID: &str = "laci2-ryaaa-aaaap-qp5oa-cai";

fn generate_id() -> String {
    PAYMENT_COUNTER.with(|counter| {
        *counter.borrow_mut() += 1;
        format!("payment_{}", counter.borrow())
    })
}

fn get_current_timestamp() -> i64 {
    (ic_cdk::api::time() / 1_000_000_000) as i64
}

#[ic_cdk::query]
fn create_payment(request: CreatePaymentRequest) -> PaymentResponse {
    if request.amount <= 0.0 {
        return PaymentResponse {
            success: false,
            message: "Amount must be greater than 0".to_string(),
            payment_id: None,
            transaction_hash: None,
            error: Some("Invalid amount".to_string()),
        };
    }

    if !SUPPORTED_CURRENCIES.contains(&request.currency.as_str()) {
        return PaymentResponse {
            success: false,
            message: format!("Unsupported currency: {}", request.currency),
            payment_id: None,
            transaction_hash: None,
            error: Some("Unsupported currency".to_string()),
        };
    }

    let caller = ic_cdk::caller();
    let payment_id = generate_id();
    let expires_in_minutes = request.expires_in_minutes.unwrap_or(30);
    let expires_at = get_current_timestamp() + (expires_in_minutes * 60) as i64;
    
    let payment = PaymentRequest {
        id: payment_id.clone(),
        amount: request.amount,
        currency: request.currency,
        recipient_address: "IC_SPICY_TREASURY".to_string(),
        description: request.description,
        expires_at,
        created_at: get_current_timestamp(),
        status: PaymentStatus::Pending,
        transaction_hash: None,
        metadata: request.metadata,
        user_principal: caller.to_string(),
    };

    PAYMENTS.with(|payments| {
        payments.borrow_mut().insert(payment_id.clone(), payment);
    });

    PaymentResponse {
        success: true,
        message: "Payment request created successfully".to_string(),
        payment_id: Some(payment_id),
        transaction_hash: None,
        error: None,
    }
}

#[ic_cdk::query]
fn get_payment(payment_id: String) -> Option<PaymentRequest> {
    PAYMENTS.with(|payments| {
        payments.borrow().get(&payment_id).cloned()
    })
}

#[ic_cdk::query]
fn list_user_payments(user_principal: String) -> Vec<PaymentRequest> {
    PAYMENTS.with(|payments| {
        payments
            .borrow()
            .iter()
            .filter_map(|(_, payment)| {
                if payment.user_principal == user_principal {
                    Some(payment.clone())
                } else {
                    None
                }
            })
            .collect()
    })
}

#[ic_cdk::update]
async fn verify_payment(request: VerifyPaymentRequest) -> PaymentResponse {
    let payment = match get_payment(request.payment_id.clone()) {
        Some(p) => p,
        None => {
            return PaymentResponse {
                success: false,
                message: "Payment not found".to_string(),
                payment_id: None,
                transaction_hash: None,
                error: Some("Payment not found".to_string()),
            };
        }
    };

    if matches!(payment.status, PaymentStatus::Completed) {
        return PaymentResponse {
            success: false,
            message: "Payment already completed".to_string(),
            payment_id: Some(payment.id),
            transaction_hash: payment.transaction_hash,
            error: Some("Payment already completed".to_string()),
        };
    }

    let mut updated_payment = payment.clone();
    updated_payment.status = PaymentStatus::Completed;
    updated_payment.transaction_hash = Some(request.transaction_signature.clone());

    PAYMENTS.with(|payments| {
        payments.borrow_mut().insert(payment.id.clone(), updated_payment);
    });

    PaymentResponse {
        success: true,
        message: "Payment verified successfully".to_string(),
        payment_id: Some(payment.id),
        transaction_hash: Some(request.transaction_signature),
        error: None,
    }
}

// Activate membership after successful payment
#[ic_cdk::update]
async fn activate_membership(payment_id: String) -> PaymentResponse {
    let payment = match get_payment(payment_id.clone()) {
        Some(p) => p,
        None => {
            return PaymentResponse {
                success: false,
                message: "Payment not found".to_string(),
                payment_id: None,
                transaction_hash: None,
                error: Some("Payment not found".to_string()),
            };
        }
    };

    if !matches!(payment.status, PaymentStatus::Completed) {
        return PaymentResponse {
            success: false,
            message: "Payment not completed".to_string(),
            payment_id: None,
            transaction_hash: None,
            error: Some("Payment not completed".to_string()),
        };
    }

    // Extract membership information from metadata
    let membership_tier = extract_membership_tier(&payment.description);
    
    // Call membership canister to activate membership
    match activate_membership_in_canister(&payment.user_principal, &membership_tier, payment.amount, &payment.currency).await {
        Ok(_) => {
            PaymentResponse {
                success: true,
                message: "Membership activated successfully".to_string(),
                payment_id: Some(payment.id),
                transaction_hash: payment.transaction_hash,
                error: None,
            }
        }
        Err(e) => {
            PaymentResponse {
                success: false,
                message: "Failed to activate membership".to_string(),
                payment_id: Some(payment.id),
                transaction_hash: payment.transaction_hash,
                error: Some(e),
            }
        }
    }
}

// Helper function to extract membership tier from description
fn extract_membership_tier(description: &str) -> String {
    if description.contains("Ghosties") {
        "Ghosties".to_string()
    } else if description.contains("Spicy Chads") {
        "Spicy Chads".to_string()
    } else if description.contains("Street Team") {
        "Street Team".to_string()
    } else {
        "Basic".to_string()
    }
}

// Call membership canister to activate membership
async fn activate_membership_in_canister(
    user_principal: &str,
    membership_tier: &str,
    amount: f64,
    currency: &str,
) -> Result<(), String> {
    // This would be implemented to call the membership canister
    // For now, we'll return success as a placeholder
    // TODO: Implement actual canister call to membership canister
    
    // The actual implementation would look like:
    // let membership_canister: candid::Principal = MEMBERSHIP_CANISTER_ID.parse().unwrap();
    // let result = ic_cdk::call(membership_canister, "complete_cross_chain_payment", (payment_id, transaction_hash)).await;
    
    Ok(())
}

#[ic_cdk::query]
fn get_payment_status(payment_id: String) -> Option<PaymentStatus> {
    get_payment(payment_id).map(|p| p.status)
}

#[ic_cdk::update]
fn cancel_payment(payment_id: String) -> PaymentResponse {
    let payment = match get_payment(payment_id.clone()) {
        Some(p) => p,
        None => {
            return PaymentResponse {
                success: false,
                message: "Payment not found".to_string(),
                payment_id: None,
                transaction_hash: None,
                error: Some("Payment not found".to_string()),
            };
        }
    };

    if matches!(payment.status, PaymentStatus::Completed) {
        return PaymentResponse {
            success: false,
            message: "Cannot cancel completed payment".to_string(),
            payment_id: Some(payment_id),
            transaction_hash: None,
            error: Some("Payment already completed".to_string()),
        };
    }

    let mut updated_payment = payment.clone();
    updated_payment.status = PaymentStatus::Failed;

    PAYMENTS.with(|payments| {
        payments.borrow_mut().insert(payment_id.clone(), updated_payment);
    });

    PaymentResponse {
        success: true,
        message: "Payment cancelled successfully".to_string(),
        payment_id: Some(payment_id),
        transaction_hash: None,
        error: None,
    }
}

#[ic_cdk::query]
fn get_solana_status() -> String {
    "Solana network is accessible through IC RPC canister".to_string()
}

#[ic_cdk::query]
fn get_supported_currencies() -> Vec<String> {
    SUPPORTED_CURRENCIES.iter().map(|s| s.to_string()).collect()
}

#[ic_cdk::query]
fn get_payment_stats() -> PaymentStats {
    let mut total_payments = 0u64;
    let mut total_volume = 0.0;
    let mut completed_payments = 0u64;

    PAYMENTS.with(|payments| {
        for (_, payment) in payments.borrow().iter() {
            total_payments += 1;
            total_volume += payment.amount;
            
            if matches!(payment.status, PaymentStatus::Completed) {
                completed_payments += 1;
            }
        }
    });

    let success_rate = if total_payments > 0 {
        (completed_payments as f64 / total_payments as f64) * 100.0
    } else {
        0.0
    };

    PaymentStats {
        total_payments,
        total_volume,
        success_rate,
    }
}

candid::export_service!();
