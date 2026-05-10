#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import axios from "axios";
import { parseConfig, ConfigValidationError } from "@hackjudge/config-engine";

program.name("hackjudge").description("HackJudge CLI").version("1.0.0");

program
  .command("init [event-name]")
  .description("Create an event.yaml from the canonical template")
  .action(async (eventName?: string) => {
    const name = eventName || "My Hackathon";
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const template = `# event.yaml — HackJudge event configuration
version: "1"

event:
  name: "${name}"
  slug: "${slug}"
  description: "An amazing hackathon"
  timezone: "UTC"
  judging_opens_at: "2025-01-01T09:00:00Z"
  judging_closes_at: "2025-01-01T18:00:00Z"

tracks:
  - id: "overall"
    name: "Overall"

criteria:
  - id: "innovation"
    name: "Innovation"
    max_score: 10
    weight: 0.5
    track_id: null
    scoring_type: "numeric"
  - id: "execution"
    name: "Execution"
    max_score: 10
    weight: 0.5
    track_id: null
    scoring_type: "numeric"

teams: []

judges: []

assignment:
  mode: "free"
  min_judges_per_team: 1
  allow_self_scoring: false

moderation:
  enabled: false
  outlier_threshold: 1.5
  allow_organizer_override: false
  require_panel_discussion: false
  lock_results_after: null

results:
  tiebreaker: "higher_avg"
  show_scores_to_judges: false
  export:
    pdf_certificates: true
    csv: true
    webhook_url: null
    webhook_secret: null
`;
    writeFileSync("./event.yaml", template, "utf-8");
    console.log(chalk.green("Created event.yaml"));
  });

program
  .command("validate [path]")
  .description("Validate an event.yaml file")
  .action(async (filePath?: string) => {
    const path = resolve(filePath || "./event.yaml");
    try {
      await parseConfig(path);
      console.log(chalk.green("Config is valid!"));
      process.exit(0);
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        for (const err of e.errors) {
          console.log(chalk.red(`${err.path}: ${err.message}`));
        }
      } else {
        console.log(chalk.red(String(e)));
      }
      process.exit(1);
    }
  });

program
  .command("deploy [path]")
  .option("--env <env>", "saas or self", "self")
  .description("Deploy an event.yaml to the API")
  .action(async (filePath?: string, options?: { env: string }) => {
    const path = resolve(filePath || "./event.yaml");
    const spinner = ora("Validating config...").start();
    try {
      await parseConfig(path);
    } catch (e) {
      spinner.fail("Validation failed");
      if (e instanceof ConfigValidationError) {
        for (const err of e.errors) console.log(chalk.red(`${err.path}: ${err.message}`));
      }
      process.exit(1);
    }
    spinner.succeed("Config valid");

    const yaml = readFileSync(path, "utf-8");
    const apiUrl = process.env.HACKJUDGE_API_URL || "http://localhost:3001";
    const apiKey = process.env.HACKJUDGE_API_KEY || "";

    spinner.start("Deploying...");
    try {
      const resp = await axios.post(
        `${apiUrl}/api/v1/events`,
        { configYaml: yaml },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      spinner.succeed(`Deployed! Dashboard: ${apiUrl}/events/${resp.data.data.slug}`);
    } catch (e: any) {
      spinner.fail(`Deploy failed: ${e.response?.data?.error?.message || e.message}`);
      process.exit(1);
    }
  });

program
  .command("results <slug>")
  .description("Fetch and display results")
  .action(async (slug: string) => {
    const apiUrl = process.env.HACKJUDGE_API_URL || "http://localhost:3001";
    const apiKey = process.env.HACKJUDGE_API_KEY || "";
    try {
      const resp = await axios.get(`${apiUrl}/api/v1/events/${slug}/results`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = resp.data.data;
      console.log(chalk.bold("Results"));
      if (data.overallRanking) {
        for (const team of data.overallRanking.slice(0, 10)) {
          console.log(`${team.teamName}: ${team.score ?? "N/A"} (${team.judgeCount} judges)`);
        }
      }
    } catch (e: any) {
      console.log(chalk.red(e.response?.data?.error?.message || e.message));
      process.exit(1);
    }
  });

program
  .command("export <slug>")
  .requiredOption("--format <format>", "pdf or csv")
  .description("Download export file")
  .action(async (slug: string, options: { format: string }) => {
    const apiUrl = process.env.HACKJUDGE_API_URL || "http://localhost:3001";
    const apiKey = process.env.HACKJUDGE_API_KEY || "";
    const format = options.format;
    const spinner = ora("Downloading...").start();
    try {
      const resp = await axios.get(`${apiUrl}/api/v1/events/${slug}/results/export/${format}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        responseType: "arraybuffer",
      });
      const filename = `${slug}-results.${format}`;
      writeFileSync(filename, Buffer.from(resp.data));
      spinner.succeed(`Saved to ${filename}`);
    } catch (e: any) {
      spinner.fail(e.response?.data?.error?.message || e.message);
      process.exit(1);
    }
  });

program.parse();
