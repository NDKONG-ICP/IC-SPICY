import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ChiliFact {
  'id' : bigint,
  'title' : string,
  'fact' : string,
  'author' : string,
  'timestamp' : bigint,
}
export interface _SERVICE {
  'add_fact' : ActorMethod<[string, string, string], bigint>,
  'get_chili_fact' : ActorMethod<[], string>,
  'get_fact' : ActorMethod<[bigint], [] | [ChiliFact]>,
  'list_facts' : ActorMethod<[], Array<ChiliFact>>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
