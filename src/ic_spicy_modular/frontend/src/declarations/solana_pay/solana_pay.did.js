export const idlFactory = ({ IDL }) => {
  const PaymentStatus = IDL.Variant({
    'Pending': IDL.Null,
    'Processing': IDL.Null,
    'Completed': IDL.Null,
    'Failed': IDL.Null,
    'Expired': IDL.Null,
  });

  const PaymentRequest = IDL.Record({
    'id': IDL.Text,
    'amount': IDL.Float64,
    'currency': IDL.Text,
    'recipient_address': IDL.Text,
    'description': IDL.Text,
    'expires_at': IDL.Int64,
    'created_at': IDL.Int64,
    'status': PaymentStatus,
    'transaction_hash': IDL.Opt(IDL.Text),
    'metadata': IDL.Opt(IDL.Text),
  });

  const CreatePaymentRequest = IDL.Record({
    'amount': IDL.Float64,
    'currency': IDL.Text,
    'description': IDL.Text,
    'expires_in_minutes': IDL.Opt(IDL.Int32),
    'metadata': IDL.Opt(IDL.Text),
  });

  const VerifyPaymentRequest = IDL.Record({
    'payment_id': IDL.Text,
    'transaction_signature': IDL.Text,
  });

  const PaymentResponse = IDL.Record({
    'success': IDL.Bool,
    'message': IDL.Text,
    'payment_id': IDL.Opt(IDL.Text),
    'transaction_hash': IDL.Opt(IDL.Text),
    'error': IDL.Opt(IDL.Text),
  });

  const PaymentStats = IDL.Record({
    'total_payments': IDL.Nat64,
    'total_volume': IDL.Float64,
    'success_rate': IDL.Float64,
  });

  return IDL.Service({
    'create_payment': IDL.Func([CreatePaymentRequest], [PaymentResponse], []),
    'get_payment': IDL.Func([IDL.Text], [IDL.Opt(PaymentRequest)], ['query']),
    'list_user_payments': IDL.Func([IDL.Text], [IDL.Vec(PaymentRequest)], ['query']),
    'verify_payment': IDL.Func([VerifyPaymentRequest], [PaymentResponse], []),
    'get_payment_status': IDL.Func([IDL.Text], [IDL.Opt(PaymentStatus)], ['query']),
    'cancel_payment': IDL.Func([IDL.Text], [PaymentResponse], []),
    'get_solana_status': IDL.Func([], [IDL.Text], ['query']),
    'get_supported_currencies': IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'get_payment_stats': IDL.Func([], [PaymentStats], ['query']),
  });
};

export const init = ({ IDL }) => { return []; };
