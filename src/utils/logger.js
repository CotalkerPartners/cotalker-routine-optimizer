/**
 * Logger Utility
 *
 * Provides colorized console output for CLI tool
 */

import chalk from 'chalk';

export const logger = {
  /**
   * Log success message
   */
  success(message) {
    console.log(chalk.green('✓'), message);
  },

  /**
   * Log error message
   */
  error(message) {
    console.log(chalk.red('✗'), message);
  },

  /**
   * Log warning message
   */
  warning(message) {
    console.log(chalk.yellow('⚠️ '), message);
  },

  /**
   * Log info message
   */
  info(message) {
    console.log(chalk.blue('ℹ'), message);
  },

  /**
   * Log critical issue
   */
  critical(message) {
    console.log(chalk.red.bold('⛔ CRITICAL:'), message);
  },

  /**
   * Log high severity issue
   */
  high(message) {
    console.log(chalk.red('⚠️  HIGH:'), message);
  },

  /**
   * Log medium severity issue
   */
  medium(message) {
    console.log(chalk.yellow('⚠️  MEDIUM:'), message);
  },

  /**
   * Log low severity issue
   */
  low(message) {
    console.log(chalk.gray('ℹ  LOW:'), message);
  },

  /**
   * Log section header
   */
  section(title) {
    console.log('');
    console.log(chalk.bold.underline(title));
    console.log('');
  },

  /**
   * Log subsection
   */
  subsection(title) {
    console.log('');
    console.log(chalk.bold(title));
  },

  /**
   * Log code block
   */
  code(code) {
    console.log(chalk.gray(code));
  },

  /**
   * Log recommendation
   */
  recommendation(text) {
    console.log(chalk.cyan('  →'), text);
  },

  /**
   * Log example
   */
  example(text) {
    console.log(chalk.dim('  Example:'), text);
  },

  /**
   * Log stage key
   */
  stage(key) {
    return chalk.magenta(key);
  },

  /**
   * Log file path
   */
  path(filePath) {
    return chalk.cyan(filePath);
  },

  /**
   * Log metric value
   */
  metric(value) {
    return chalk.yellow.bold(value);
  },

  /**
   * Format bytes in human-readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Format percentage
   */
  formatPercentage(value) {
    return Math.round(value * 100) + '%';
  },

  /**
   * Log separator
   */
  separator() {
    console.log(chalk.gray('━'.repeat(60)));
  },

  /**
   * Log divider (thin)
   */
  divider() {
    console.log(chalk.gray('─'.repeat(60)));
  }
};

/**
 * Log severity-based message
 */
export function logSeverity(severity, message) {
  switch (severity) {
    case 'CRITICAL':
      logger.critical(message);
      break;
    case 'HIGH':
      logger.high(message);
      break;
    case 'MEDIUM':
      logger.medium(message);
      break;
    case 'LOW':
      logger.low(message);
      break;
    default:
      logger.info(message);
  }
}

/**
 * Log issue with formatted output
 */
export function logIssue(issue) {
  logger.separator();
  logSeverity(issue.severity, issue.message);

  if (issue.stage) {
    console.log('  Stage:', logger.stage(issue.stage));
  }

  if (issue.details) {
    console.log('  Details:', issue.details);
  }

  if (issue.recommendation) {
    logger.recommendation(issue.recommendation);
  }

  if (issue.example) {
    logger.example(issue.example);
  }

  if (issue.reference) {
    console.log(chalk.dim('  Reference:'), issue.reference);
  }
}

/**
 * Log summary report
 */
export function logSummary(summary) {
  logger.section('Summary');

  console.log('Total issues found:', logger.metric(summary.total));

  if (summary.bySeverity) {
    console.log('  Critical:', chalk.red(summary.bySeverity.CRITICAL || 0));
    console.log('  High:', chalk.yellow(summary.bySeverity.HIGH || 0));
    console.log('  Medium:', chalk.blue(summary.bySeverity.MEDIUM || 0));
    console.log('  Low:', chalk.gray(summary.bySeverity.LOW || 0));
  }

  if (summary.byType) {
    logger.subsection('By Type:');
    Object.entries(summary.byType).forEach(([type, count]) => {
      console.log(`  ${type}:`, count);
    });
  }

  if (summary.estimatedImprovements) {
    logger.subsection('Estimated Improvements:');
    const imp = summary.estimatedImprovements;

    if (imp.payloadReduction) {
      console.log('  Payload size:',
        logger.formatBytes(imp.payloadReduction.before),
        '→',
        logger.formatBytes(imp.payloadReduction.after),
        chalk.green(`(${logger.formatPercentage(imp.payloadReduction.reduction)} reduction)`)
      );
    }

    if (imp.networkCallReduction) {
      console.log('  Network calls:',
        logger.metric(imp.networkCallReduction.before),
        '→',
        logger.metric(imp.networkCallReduction.after),
        chalk.green(`(${logger.formatPercentage(imp.networkCallReduction.reduction)} reduction)`)
      );
    }

    if (imp.executionTime) {
      console.log('  Execution time:',
        imp.executionTime.before,
        '→',
        imp.executionTime.after,
        chalk.green(`(${logger.formatPercentage(imp.executionTime.reduction)} faster)`)
      );
    }
  }
}

export default logger;
