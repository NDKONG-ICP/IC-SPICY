export const idlFactory = ({ IDL }) => {
  const FarmingAdvice = IDL.Record({
    'id' : IDL.Nat,
    'crop' : IDL.Text,
    'difficulty' : IDL.Text,
    'tips' : IDL.Vec(IDL.Text),
    'season' : IDL.Text,
    'advice' : IDL.Text,
  });
  const AIResponse = IDL.Record({
    'id' : IDL.Nat,
    'question' : IDL.Text,
    'user' : IDL.Principal,
    'answer' : IDL.Text,
    'timestamp' : IDL.Int,
    'category' : IDL.Text,
    'confidence' : IDL.Float64,
  });
  const WeatherData = IDL.Record({
    'wind_speed' : IDL.Float64,
    'temperature' : IDL.Float64,
    'description' : IDL.Text,
    'pressure' : IDL.Float64,
    'humidity' : IDL.Float64,
    'timestamp' : IDL.Int,
    'location' : IDL.Text,
  });
  return IDL.Service({
    'addWeatherData' : IDL.Func(
        [
          IDL.Text,
          IDL.Float64,
          IDL.Float64,
          IDL.Float64,
          IDL.Float64,
          IDL.Text,
        ],
        [IDL.Bool],
        [],
      ),
    'ask_ai' : IDL.Func([IDL.Text], [IDL.Text], []),
    'getAIStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'categories' : IDL.Vec(IDL.Text),
            'total_users' : IDL.Nat,
            'total_questions' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getAllFarmingAdvice' : IDL.Func([], [IDL.Vec(FarmingAdvice)], ['query']),
    'getConversationHistory' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(AIResponse)],
        ['query'],
      ),
    'getFarmingAdviceByCrop' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(FarmingAdvice)],
        ['query'],
      ),
    'getWeatherData' : IDL.Func([IDL.Text], [IDL.Opt(WeatherData)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
