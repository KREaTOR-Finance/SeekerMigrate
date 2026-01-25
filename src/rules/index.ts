/**
 * Conversion Rules Module
 *
 * Loads and matches conversion rules based on detected UAM patterns.
 */

import type { ConversionRule, UAM_Auth } from '../schema/uam.js';
import firebaseToSeekerRules from './firebaseToSeeker.json' with { type: 'json' };

/**
 * Rule set containing all conversion rules
 */
export interface RuleSet {
  version: string;
  rules: ConversionRule[];
  metadata: {
    lastUpdated: string;
    author: string;
    targetPlatform: string;
    supportedFrameworks: string[];
  };
}

/**
 * Extended conversion rule with additional metadata
 */
export interface ExtendedRule extends ConversionRule {
  name?: string;
  behavioralNotes?: string[];
  migrationSteps?: string[];
}

/**
 * Get all available rule sets
 */
export function getAllRuleSets(): RuleSet[] {
  return [firebaseToSeekerRules as RuleSet];
}

/**
 * Find matching rules for a given UAM
 */
export function findMatchingRules(uam: UAM_Auth): ExtendedRule[] {
  const matchingRules: ExtendedRule[] = [];

  for (const ruleSet of getAllRuleSets()) {
    for (const rule of ruleSet.rules) {
      if (
        rule.source.method === uam.method &&
        rule.source.provider === uam.provider
      ) {
        matchingRules.push(rule as ExtendedRule);
      }
    }
  }

  return matchingRules;
}

/**
 * Get a specific rule by ID
 */
export function getRuleById(ruleId: string): ExtendedRule | null {
  for (const ruleSet of getAllRuleSets()) {
    const rule = ruleSet.rules.find((r) => r.id === ruleId);
    if (rule) {
      return rule as ExtendedRule;
    }
  }
  return null;
}

/**
 * Parse action strings from rule
 */
export function parseActions(actions: string[]): ParsedAction[] {
  return actions.map((action) => {
    const [type, ...rest] = action.split(': ');
    const value = rest.join(': ').trim();

    switch (type) {
      case 'remove_package':
        return { type: 'remove_package', packageName: value };
      case 'add_package':
        return { type: 'add_package', packageName: value };
      case 'generate_template':
        return { type: 'generate_template', templateName: value };
      case 'modify_file':
        return { type: 'modify_file', filePath: value };
      case 'create_file':
        return { type: 'create_file', filePath: value };
      default:
        return { type: 'unknown', raw: action };
    }
  });
}

/**
 * Parsed action from rule
 */
export type ParsedAction =
  | { type: 'remove_package'; packageName: string }
  | { type: 'add_package'; packageName: string }
  | { type: 'generate_template'; templateName: string }
  | { type: 'modify_file'; filePath: string }
  | { type: 'create_file'; filePath: string }
  | { type: 'unknown'; raw: string };
