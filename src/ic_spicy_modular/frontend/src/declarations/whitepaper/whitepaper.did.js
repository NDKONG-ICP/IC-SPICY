export const idlFactory = ({ IDL }) => {
  return IDL.Service({ 'get_whitepaper_info' : IDL.Func([], [IDL.Text], []) });
};
export const init = ({ IDL }) => { return []; };
