import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Post {
  'id' : bigint,
  'title' : string,
  'content' : string,
  'author' : string,
  'timestamp' : bigint,
}
export interface _SERVICE {
  'add_post' : ActorMethod<[string, string, string], bigint>,
  'get_blog_info' : ActorMethod<[], string>,
  'icrc21_canister_call_consent_message' : ActorMethod<[], [] | [string]>,
  'icrc21_canister_call_consent_message_metadata' : ActorMethod<
    [],
    [] | [Array<string>]
  >,
  'icrc21_canister_call_consent_message_preview' : ActorMethod<
    [],
    [] | [string]
  >,
  'icrc21_canister_call_consent_message_url' : ActorMethod<[], [] | [string]>,
  'list_posts' : ActorMethod<[], Array<Post>>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
