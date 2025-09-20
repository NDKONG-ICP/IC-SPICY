export const idlFactory = ({ IDL }) => {
  return IDL.Service({ 'get_profile' : IDL.Func([], [IDL.Text], []) });
};
export const init = ({ IDL }) => { return []; };
