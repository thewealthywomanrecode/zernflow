import { describe, it, expect } from 'vitest';
import { buildWealthPlanUrl, resolveMessageLinks } from './wealth-plan-link';
describe('personalized Wealth Plan links', () => {
 it('encodes email aliases and names without changing their values', () => {
  const result = new URL(buildWealthPlanUrl('sarah+plan@example.com', 'Sarah & Jo'));
  expect(result.searchParams.get('email')).toBe('sarah+plan@example.com');
  expect(result.searchParams.get('name')).toBe('Sarah & Jo');
 });
 it('unknown contacts get an ordinary link, never empty identity placeholders', () => {
  for (const value of [undefined, '', 'not an email']) expect(new URL(buildWealthPlanUrl(value)).search).toBe('');
 });
 it('resolves button and carousel links and preserves original static offer links', () => {
  const link=buildWealthPlanUrl('a+b@example.com');
  const result=resolveMessageLinks({buttons:[{type:'url',title:'Plan',url:'{{wealth_plan_url}}'},{type:'url',title:'Old offer',url:'https://www.thewealthywomanrecode.com/wealthflow-demo'}],carousel:{elements:[{title:'Plan',buttons:[{type:'url',title:'Open',url:'https://example.com/?email={{captured_email}}'}]}]}},{wealth_plan_url:link,captured_email:'a+b@example.com'});
  expect(result.buttons?.[0].url).toBe(link);
  expect(result.buttons?.[1].url).toBe('https://www.thewealthywomanrecode.com/wealthflow-demo');
  expect(new URL(result.carousel!.elements[0].buttons![0].url!).searchParams.get('email')).toBe('a+b@example.com');
 });
});
