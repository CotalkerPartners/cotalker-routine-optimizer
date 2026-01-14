#!/usr/bin/env node

/**
 * Cotalker Optimizer CLI
 *
 * Main entry point for the CLI tool
 */

import { Command } from 'commander';
import { parseRoutineFile } from './parsers/routine-parser.js';
import {
  analyzeRoutine,
  getIssuesByCategory,
  getCriticalIssues,
  getPrioritizedRecommendations
} from './analyzers/index.js';
import { logger, logIssue, logSummary } from './utils/logger.js';
import { formatBytes } from './utils/payload-estimator.js';

const program = new Command();

program
  .name('cotalker-optimize')
  .description('Analyze and optimize Cotalker bot routines')
  .version('1.0.0');

/**
 * Analyze command
 */
program
  .command('analyze <file>')
  .description('Analyze a Cotalker routine file')
  .option('-f, --output-format <format>', 'Output format (json|markdown|html)', 'markdown')
  .option('-s, --severity <level>', 'Filter by severity (all|critical|high|medium|low)', 'all')
  .option('-c, --checks <checks>', 'Specific checks (loop,payload,patch,scalability)', 'loop,payload,patch,scalability')
  .action(async (file, options) => {
    try {
      logger.section('Analyzing Cotalker Routine');
      logger.info(`File: ${logger.path(file)}`);
      logger.info(`Checks: ${options.checks}`);
      console.log('');

      // Parse routine
      logger.info('Parsing routine...');
      const routine = parseRoutineFile(file);

      logger.success(`Parsed ${routine.surveyTriggers.length} trigger(s)`);

      // Count stages
      const totalStages = routine.surveyTriggers.reduce((sum, t) =>
        sum + t.stages.length, 0
      );
      logger.info(`Total stages: ${totalStages}`);
      console.log('');

      // Run all analyzers
      const checks = options.checks.split(',').map(c => c.trim());
      logger.info(`Running analyzers: ${checks.join(', ')}`);
      console.log('');

      const results = analyzeRoutine(routine, {
        checks,
        severityFilter: options.severity,
        context: {}
      });

      // Display issues by category
      if (results.issues.length === 0) {
        logger.success('No issues found!');
        console.log('');
      } else {
        logger.warning(`Found ${results.issues.length} issue(s)`);
        console.log('');

        // Show critical issues first
        const critical = getCriticalIssues(results);
        if (critical.length > 0) {
          logger.section('CRITICAL ISSUES (Immediate Action Required)');
          critical.forEach(issue => logIssue(issue));
        }

        // Group by category
        const categories = getIssuesByCategory(results);

        if (categories.memory.length > 0) {
          logger.section('Memory / Payload Issues');
          logger.info(`${categories.memory.length} issue(s) related to payload size and memory usage`);
          console.log('');
          categories.memory.forEach(issue => {
            if (issue.severity !== 'CRITICAL') { // Already shown above
              logIssue(issue);
            }
          });
        }

        if (categories.timeout.length > 0) {
          logger.section('Timeout / Scalability Issues');
          logger.info(`${categories.timeout.length} issue(s) related to execution time and scalability`);
          console.log('');
          categories.timeout.forEach(issue => {
            if (issue.severity !== 'CRITICAL') {
              logIssue(issue);
            }
          });
        }

        if (categories.network.length > 0 && !critical.some(i => i.type.includes('NETWORK'))) {
          logger.section('Network Efficiency Issues');
          logger.info(`${categories.network.length} issue(s) related to network calls`);
          console.log('');
          categories.network.forEach(issue => {
            if (issue.severity !== 'CRITICAL' && !issue.type.includes('ITERATION')) {
              logIssue(issue);
            }
          });
        }

        if (categories.robustness.length > 0) {
          logger.section('Robustness Issues');
          logger.info(`${categories.robustness.length} issue(s) related to error handling`);
          console.log('');
          categories.robustness.forEach(issue => {
            logIssue(issue);
          });
        }
      }

      // Enhanced summary
      if (results.issues.length > 0) {
        const summary = {
          total: results.summary.total,
          bySeverity: results.summary.bySeverity,
          byType: results.summary.byType,
          estimatedImprovements: {}
        };

        // Network call improvements
        if (results.estimatedImprovements.networkCallReduction.before > 0) {
          summary.estimatedImprovements.networkCallReduction = {
            before: results.estimatedImprovements.networkCallReduction.before,
            after: results.estimatedImprovements.networkCallReduction.after,
            reduction: results.estimatedImprovements.networkCallReduction.reduction
          };
        }

        // Payload improvements
        if (results.estimatedImprovements.payloadReduction.before > 0) {
          summary.estimatedImprovements.payloadReduction = {
            before: results.estimatedImprovements.payloadReduction.before,
            after: results.estimatedImprovements.payloadReduction.after,
            reduction: results.estimatedImprovements.payloadReduction.reduction,
            beforeFormatted: formatBytes(results.estimatedImprovements.payloadReduction.before),
            afterFormatted: formatBytes(results.estimatedImprovements.payloadReduction.after)
          };
        }

        // Execution time improvements
        if (results.estimatedImprovements.executionTime.before > 0) {
          summary.estimatedImprovements.executionTime = {
            before: `~${results.estimatedImprovements.executionTime.before} seconds`,
            after: `~${results.estimatedImprovements.executionTime.after} seconds`,
            reduction: results.estimatedImprovements.executionTime.reduction
          };
        }

        logSummary(summary);

        // Prioritized recommendations
        const recommendations = getPrioritizedRecommendations(results);
        if (recommendations.length > 0) {
          logger.section('Prioritized Recommendations');
          recommendations.forEach(rec => {
            logger.subsection(`${rec.priority}: ${rec.title} (${rec.count} issue(s))`);
            rec.issues.slice(0, 3).forEach(issue => { // Show top 3
              console.log(`  • Stage: ${logger.stage(issue.stage)}`);
              console.log(`    ${issue.message}`);
            });
            console.log('');
          });
        }
      }

      // Output format
      if (options.outputFormat === 'json') {
        console.log('');
        logger.section('JSON Output');
        console.log(JSON.stringify(results, null, 2));
      }

    } catch (error) {
      logger.error(`Failed to analyze routine: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

/**
 * Optimize command
 */
program
  .command('optimize <file>')
  .description('Generate optimized version of routine')
  .option('-o, --output <file>', 'Output file', 'optimized-routine.js')
  .option('-a, --apply <optimizations>', 'Apply specific optimizations (loop,ccjs,patch,errors)', 'loop,patch,errors')
  .option('--dry-run', 'Preview changes without writing files')
  .action((file, options) => {
    logger.warning('Optimize command not yet implemented');
    logger.info('Coming soon: automatic optimization generation');
  });

/**
 * Interactive command
 */
program
  .command('interactive <file>')
  .description('Interactive optimization wizard')
  .action((file, options) => {
    logger.warning('Interactive mode not yet implemented');
    logger.info('Coming soon: guided step-by-step optimization');
  });

/**
 * Validate COTLang command
 */
program
  .command('validate-cotlang <expression>')
  .description('Validate a COTLang expression')
  .option('-c, --context <context>', 'Context type (StateSurvey|WorkflowStart|SlashCommand)', 'StateSurvey')
  .action((expression, options) => {
    logger.warning('COTLang validation not yet implemented');
    logger.info('Coming soon: COTLang syntax validation');
  });


// Parse command line arguments
program.parse();
