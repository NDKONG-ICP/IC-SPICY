export const idlFactory = ({ IDL }) => {
  const Post = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'content' : IDL.Text,
    'author' : IDL.Text,
    'timestamp' : IDL.Int,
    'photo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  return IDL.Service({
    'add_post' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Vec(IDL.Nat8))], [IDL.Nat], []),
    'get_blog_info' : IDL.Func([], [IDL.Text], ['query']),
    'get_post' : IDL.Func([IDL.Nat], [IDL.Opt(Post)], ['query']),
    'list_posts' : IDL.Func([], [IDL.Vec(Post)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
