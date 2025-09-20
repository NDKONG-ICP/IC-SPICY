export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'get_user_data' : IDL.Func(
        [],
        [
          IDL.Opt(
            IDL.Record({
              'name' : IDL.Text,
              'referral_code' : IDL.Opt(IDL.Text),
              'engagement' : IDL.Nat,
              'location' : IDL.Text,
            })
          ),
        ],
        ['query'],
      ),
    'initialize' : IDL.Func([IDL.Text, IDL.Text, IDL.Opt(IDL.Text)], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
