export const idlFactory = ({ IDL }) => {
  const PaymentResponse = IDL.Record({
    'transaction_hash' : IDL.Opt(IDL.Text),
    'error' : IDL.Opt(IDL.Text),
    'message' : IDL.Text,
    'success' : IDL.Bool,
    'payment_id' : IDL.Opt(IDL.Text),
  });
  const CreatePaymentRequest = IDL.Record({
    'metadata' : IDL.Opt(IDL.Text),
    'description' : IDL.Text,
    'expires_in_minutes' : IDL.Opt(IDL.Int32),
    'currency' : IDL.Text,
    'amount' : IDL.Float64,
  });
  const PaymentStatus = IDL.Variant({
    'Failed' : IDL.Null,
    'Processing' : IDL.Null,
    'Completed' : IDL.Null,
    'Expired' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const PaymentRequest = IDL.Record({
    'id' : IDL.Text,
    'status' : PaymentStatus,
    'user_principal' : IDL.Text,
    'transaction_hash' : IDL.Opt(IDL.Text),
    'metadata' : IDL.Opt(IDL.Text),
    'description' : IDL.Text,
    'created_at' : IDL.Int64,
    'currency' : IDL.Text,
    'recipient_address' : IDL.Text,
    'amount' : IDL.Float64,
    'expires_at' : IDL.Int64,
  });
  const VerifyPaymentRequest = IDL.Record({
    'payment_id' : IDL.Text,
    'transaction_signature' : IDL.Text,
  });
  return IDL.Service({
    'activate_membership' : IDL.Func([IDL.Text], [PaymentResponse], []),
    'cancel_payment' : IDL.Func([IDL.Text], [PaymentResponse], []),
    'create_payment' : IDL.Func([CreatePaymentRequest], [PaymentResponse], []),
    'get_payment' : IDL.Func([IDL.Text], [IDL.Opt(PaymentRequest)], []),
    'get_payment_stats' : IDL.Func(
        [],
        [
          IDL.Record({
            'success_rate' : IDL.Float64,
            'total_volume' : IDL.Float64,
            'total_payments' : IDL.Nat64,
          }),
        ],
        [],
      ),
    'get_payment_status' : IDL.Func([IDL.Text], [IDL.Opt(PaymentStatus)], []),
    'get_solana_status' : IDL.Func([], [IDL.Text], []),
    'get_supported_currencies' : IDL.Func([], [IDL.Vec(IDL.Text)], []),
    'list_user_payments' : IDL.Func([IDL.Text], [IDL.Vec(PaymentRequest)], []),
    'verify_payment' : IDL.Func([VerifyPaymentRequest], [PaymentResponse], []),
  });
};
export const init = ({ IDL }) => { return []; };
