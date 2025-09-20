import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AIResponse {
  'id' : bigint,
  'question' : string,
  'user' : Principal,
  'answer' : string,
  'timestamp' : bigint,
  'category' : string,
  'confidence' : number,
}
export interface FarmingAdvice {
  'id' : bigint,
  'crop' : string,
  'difficulty' : string,
  'tips' : Array<string>,
  'season' : string,
  'advice' : string,
}
export interface WeatherData {
  'wind_speed' : number,
  'temperature' : number,
  'description' : string,
  'pressure' : number,
  'humidity' : number,
  'timestamp' : bigint,
  'location' : string,
}
export interface _SERVICE {
  'addWeatherData' : ActorMethod<
    [string, number, number, number, number, string],
    boolean
  >,
  'ask_ai' : ActorMethod<[string], string>,
  'getAIStats' : ActorMethod<
    [],
    {
      'categories' : Array<string>,
      'total_users' : bigint,
      'total_questions' : bigint,
    }
  >,
  'getAllFarmingAdvice' : ActorMethod<[], Array<FarmingAdvice>>,
  'getConversationHistory' : ActorMethod<[Principal], Array<AIResponse>>,
  'getFarmingAdviceByCrop' : ActorMethod<[string], [] | [FarmingAdvice]>,
  'getWeatherData' : ActorMethod<[string], [] | [WeatherData]>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
