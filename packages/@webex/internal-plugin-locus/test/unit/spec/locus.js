/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {assert} from '@webex/test-helper-chai';
import MockWebex from '@webex/test-helper-mock-webex';
import Locus, {DESYNC, USE_INCOMING, USE_CURRENT, FETCH} from '@webex/internal-plugin-locus';

import basicSequenceComparisons from '../lib/BasicSeqCmp';
import sequenceComparisons from '../lib/SeqCmp';

assert(DESYNC);
describe('plugin-locus', () => {
  describe('Locus', () => {
    /* eslint max-nested-callbacks: [0] */
    let webex;

    beforeEach(() => {
      webex = new MockWebex({
        children: {
          locus: Locus
        }
      });
    });

    describe('basic sequence comparisons', () => {
      Object.keys(basicSequenceComparisons.comparisons).forEach((key) => {
        const incomingKey = basicSequenceComparisons.comparisons[key].new;
        const currentKey = basicSequenceComparisons.comparisons[key].current;
        const {result} = basicSequenceComparisons.comparisons[key];

        const current = basicSequenceComparisons.sequences[currentKey];
        const incoming = basicSequenceComparisons.sequences[incomingKey];

        it(key, () => {
          assert.isDefined(current);
          assert.isDefined(incoming);

          assert.equal(webex.internal.locus.compareSequence(current, incoming), result);
        });
      });
    });

    describe('sequence comparisons', () => {
      Object.keys(sequenceComparisons.comparisons).forEach((key) => {
        const incomingKey = sequenceComparisons.comparisons[key].new;
        const currentKey = sequenceComparisons.comparisons[key].current;
        const {description, result} = sequenceComparisons.comparisons[key];

        const current = sequenceComparisons.sequences[currentKey];
        const incoming = sequenceComparisons.sequences[incomingKey];

        describe(description, () => {
          it(key, () => {
            assert.isDefined(current);
            assert.isDefined(incoming);

            assert.equal(webex.internal.locus.compareSequence(current, incoming), result);
          });
        });
      });

      describe('delta sequence comparisons', () => {
        function translate(name) {
          switch (name) {
            case 'ACCEPT_NEW':
              return USE_INCOMING;
            case 'KEEP_CURRENT':
              return USE_CURRENT;
            case 'DESYNC':
              return FETCH;
            default:
              throw new Error(`${name} not recorgnized`);
          }
        }
        Object.keys(sequenceComparisons.update_actions).forEach((key) => {
          const incomingKey = sequenceComparisons.update_actions[key].new;
          const currentKey = sequenceComparisons.update_actions[key].current;
          const baseKey = sequenceComparisons.update_actions[key].newbase;
          const {description, result} = sequenceComparisons.update_actions[key];

          const current = {
            sequence: sequenceComparisons.sequences[currentKey]
          };
          const incoming = {
            sequence: sequenceComparisons.sequences[incomingKey],
            baseSequence: sequenceComparisons.sequences[baseKey]
          };

          describe(description, () => {
            it(key, () => {
              assert.isDefined(current.sequence);
              assert.isDefined(incoming.sequence);

              assert.equal(webex.internal.locus.compare(current, incoming), translate(result));
            });
          });
        });
      });
    });
  });
});
