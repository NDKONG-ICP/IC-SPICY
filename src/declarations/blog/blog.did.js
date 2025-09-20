export const idlFactory = ({ IDL }) => {
  const Post = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'content' : IDL.Text,
    'author' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  return IDL.Service({
    'add_post' : IDL.Func([IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'get_blog_info' : IDL.Func([], [IDL.Text], ['query']),
    'icrc21_canister_call_consent_message' : IDL.Func(
        [],
        [IDL.Opt(IDL.Text)],
        ['query'],
      ),
    'icrc21_canister_call_consent_message_metadata' : IDL.Func(
        [],
        [IDL.Opt(IDL.Vec(IDL.Text))],
        ['query'],
      ),
    'icrc21_canister_call_consent_message_preview' : IDL.Func(
        [],
        [IDL.Opt(IDL.Text)],
        ['query'],
      ),
    'icrc21_canister_call_consent_message_url' : IDL.Func(
        [],
        [IDL.Opt(IDL.Text)],
        ['query'],
      ),
    'list_posts' : IDL.Func([], [IDL.Vec(Post)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
