export default function safeEval(str: string) {
  return eval.call(
    Object.create(null),
    `const __INTERNAL__OBJ = ${str}; __INTERNAL__OBJ`
  );
}
