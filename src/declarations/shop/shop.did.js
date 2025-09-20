export const idlFactory = ({ IDL }) => {
  return IDL.Service({ 'get_shop_items' : IDL.Func([], [IDL.Text], []) });
};
export const init = ({ IDL }) => { return []; };
