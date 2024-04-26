import { Alert, Box, Link, Sheet, TabPanel, Typography } from "@mui/joy";
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
  const [obj1Val, setObj1Val] = useState(`{
    a: 1, b: 2
  }`);
  const [obj2Val, setObj2Val] = useState(`{
    a: 2, c: 5
  }`);
  const [raw, setRaw] = useState<Array<DiffResult>>([]);

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
      setRaw(diff(a, b));
    } catch (error) {
      console.log("error");
    }
  }, [obj1Val, obj2Val]);

  return (
    <Box sx={{}}>
      <Box
        sx={{
          borderBottom: "1px solid grey",
          p: 1,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex" }}>
          <img src="/Logo.svg" alt="Logo" height="35" />
          <Typography level="h4" sx={{ ml: 2, letterSpacing: "2px" }}>
            obj-diff
          </Typography>
        </Box>
        <Link
          href="https://github.com/Open-Tech-Foundation/obj-diff"
          endDecorator={<Launch fontSize="inherit" />}
          target="_blank"
          rel="noopener"
          fontSize="sm"
        >
          Github
        </Link>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Alert variant="soft" color="success">
          <Typography level="body-md">
            🚀 The Fast, Accurate, JavaScript Objects Diffing Library.
          </Typography>
        </Alert>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 10px 1fr 10px 1fr",
          p: "50px",
          height: "600px",
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
                <Tab>Visualize</Tab>
                <Tab>Raw</Tab>
              </TabList>
              <TabPanel
                value={0}
                sx={{ height: "calc(100% - 35px)", overflow: "auto" }}
              ></TabPanel>
              <TabPanel
                value={1}
                sx={{ height: "calc(100% - 35px)", overflow: "auto" }}
              >
                <Box component="pre">{JSON.stringify(raw, null, 4)}</Box>
              </TabPanel>
            </Tabs>
          </Sheet>
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
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
