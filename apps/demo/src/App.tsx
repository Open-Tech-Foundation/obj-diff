import { Alert, Box, Card, Link, Sheet, TabPanel, Typography } from "@mui/joy";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { useCallback, useEffect, useState } from "react";
import { diff, type DiffResult } from "@opentf/obj-diff";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import Launch from "@mui/icons-material/Launch";
import prettier from "prettier/standalone";
import * as babelPlugin from "prettier/parser-babel";
import * as estreeParser from "prettier/plugins/estree";
import Visualizer from "./Visualizer";
import { strReplace } from "@opentf/std";
import ReportIcon from "@mui/icons-material/Report";

function replacer(key, value) {
  if (typeof value === "bigint") {
    return `__INTERNAL__BIGINT__${value}n`;
  }

  if (value === undefined) {
    return `__INTERNAL__UNDEFINED`;
  }

  return value;
}

function getDiffResults(diffResult) {
  let out = JSON.stringify(diffResult, replacer, 4);
  out = strReplace(out, `"__INTERNAL__UNDEFINED"`, "undefined", { all: true });
  const test = /"__INTERNAL__BIGINT__(\d+)n"/;
  function convert(str, p1) {
    return `${p1}n`;
  }
  out = strReplace(out, test, convert, { all: true });
  return out;
}

async function format(code: string) {
  const formatted = await prettier.format(`const a = ${code}`, {
    parser: "babel",
    plugins: [babelPlugin, estreeParser],
    semi: false,
    trailingComma: "none",
  });

  return formatted.replace("const a = ", "");
}

function App() {
  const [err, setErr] = useState(null);
  const [obj1Val, setObj1Val] = useState(`{
    a: 1, b: null, g: 8
  }`);
  const [obj2Val, setObj2Val] = useState(`{
    a: 2, g: 8, c: 'Hello World',
  }`);
  // const [obj1Val, setObj1Val] = useState(`{
  //   foo: {
  //     bar: {
  //       a: ['a', 'b'],
  //       b: 2,
  //       c: ['x', 'y'],
  //       e: 100
  //     }
  //   },
  //   buzz: 'world'
  // }`);
  // const [obj2Val, setObj2Val] = useState(`{
  //   foo: {
  //     bar: {
  //       a: ['a'],
  //       b: 2,
  //       c: ['x', 'y', 'z'],
  //       d: 'Hello, world!'
  //     }
  //   },
  //   buzz: 'fizz'
  // }`);
  const [diffResult, setDiffResult] = useState<Array<DiffResult>>([]);

  useEffect(() => {
    async function runFormat() {
      setObj1Val(await format(obj1Val));
      setObj2Val(await format(obj2Val));
    }

    runFormat();
  }, []);

  const onChange1 = useCallback((val: string) => {
    setObj1Val(val);
  }, []);

  const onChange2 = useCallback((val: string) => {
    setObj2Val(val);
  }, []);

  useEffect(() => {
    try {
      const a = eval(`const a = ${obj1Val}; a`);
      const b = eval(`const a = ${obj2Val}; a`);
      setDiffResult(diff(a, b));
      setErr(null);
    } catch (error) {
      setErr(error);
      setDiffResult([]);
    }
  }, [obj1Val, obj2Val]);

  return (
    <Box bgcolor="background.level1">
      <Box
        sx={{
          borderBottom: "1px solid lightgrey",
          p: 1,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          height: "50px",
          background: "white",
        }}
      >
        <Box sx={{ display: "flex" }}>
          <img src="/Logo.svg" alt="Logo" height="35" />
          <Typography level="h4" sx={{ ml: 2, letterSpacing: "2px" }}>
            Obj-Diff
          </Typography>
        </Box>
        <Link
          href="https://github.com/Open-Tech-Foundation/obj-diff"
          endDecorator={<Launch fontSize="inherit" />}
          target="_blank"
          rel="noopener"
          fontSize="sm"
        >
          GitHub
        </Link>
      </Box>
      <Box sx={{ height: "calc(100vh - 100px)" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Card size="sm">
            <Typography level="body-lg">
              🚀 The Fast, Accurate, JavaScript Objects Diffing Library.
            </Typography>
          </Card>
        </Box>

        <Box sx={{ mt: 2, mx: 5 }}>
          {err && (
            <Alert
              sx={{ alignItems: "flex-start" }}
              startDecorator={<ReportIcon />}
              variant="soft"
              color="danger"
              size="sm"
            >
              <div>
                <div>{err.name}</div>
                <Typography level="body-sm" color="danger">
                  {err.message}
                </Typography>
              </div>
            </Alert>
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 10px 1fr 10px 1fr",
            p: "50px",
            height: "75vh",
            boxSizing: "border-box",
          }}
        >
          <Box sx={{ height: "100%", overflow: "hidden" }}>
            <Sheet
              variant="outlined"
              sx={{
                height: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
              }}
            >
              <Typography level="body-sm" sx={{ textAlign: "center" }}>
                Object 1
              </Typography>
              <Box sx={{ height: "calc(100% - 25px)", overflow: "auto" }}>
                <CodeMirror
                  value={obj1Val}
                  extensions={[javascript()]}
                  onChange={onChange1}
                  height="100%"
                />
              </Box>
            </Sheet>
          </Box>
          <Box />
          <Box sx={{ height: "100%", overflow: "hidden" }}>
            <Sheet
              variant="outlined"
              sx={{
                height: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
              }}
            >
              <Typography level="body-sm" sx={{ textAlign: "center" }}>
                Object 2
              </Typography>
              <Box sx={{ height: "calc(100% - 25px)", overflow: "auto" }}>
                <CodeMirror
                  value={obj2Val}
                  extensions={[javascript()]}
                  onChange={onChange2}
                />
              </Box>
            </Sheet>
          </Box>
          <Box />
          <Box sx={{ height: "100%", overflow: "hidden" }}>
            <Sheet
              variant="outlined"
              sx={{ height: "100%", boxSizing: "border-box" }}
            >
              <Tabs
                aria-label="Basic tabs"
                defaultValue={0}
                sx={{ height: "100%" }}
              >
                <TabList sx={{ display: "flex", justifyContent: "center" }}>
                  <Tab indicatorPlacement="top">Visualize</Tab>
                  <Tab indicatorPlacement="top">Diff</Tab>
                </TabList>
                <TabPanel
                  value={0}
                  sx={{ height: "calc(100% - 35px)", overflow: "auto", p: 0 }}
                >
                  <Visualizer obj={obj1Val} diff={diffResult} />
                </TabPanel>
                <TabPanel
                  value={1}
                  sx={{ height: "calc(100% - 35px)", overflow: "auto" }}
                >
                  <Box component="pre">{getDiffResults(diffResult)}</Box>
                </TabPanel>
              </Tabs>
            </Sheet>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box sx={{ mr: 1 }} component="span">
          {" "}
          © 2024
        </Box>
        <Link href="https://open-tech-foundation.pages.dev/">
          Open Tech Foundation
        </Link>
        .
      </Box>
    </Box>
  );
}

export default App;
