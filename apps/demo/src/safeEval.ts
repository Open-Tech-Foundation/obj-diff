export default function safeEval(str: string) {
  return function () {
    return eval(str);
  }.call({});
}
