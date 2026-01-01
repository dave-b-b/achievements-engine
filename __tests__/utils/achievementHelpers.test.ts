import { AchievementBuilder } from '../../src/utils/achievementHelpers';
import { CustomAchievementDetails } from '../../src/types';

describe('AchievementBuilder - Three-Tier API', () => {

  describe('Tier 1: Simple Static Methods', () => {

    describe('createScoreAchievement', () => {
      it('should create single score achievement with smart defaults', () => {
        const achievement = AchievementBuilder.createScoreAchievement(100);
        const config = achievement.toConfig();

        expect(config).toEqual({
          score: {
            100: {
              title: 'Score 100!',
              description: 'Score 100 points',
              icon: '🏆'
            }
          }
        });
      });

      it('should support chainable award customization', () => {
        const achievement = AchievementBuilder.createScoreAchievement(100)
          .withAward({ title: 'Century!', description: 'Amazing!', icon: '🎉' });
        const config = achievement.toConfig();

        expect(config).toEqual({
          score: {
            100: {
              title: 'Century!',
              description: 'Amazing!',
              icon: '🎉'
            }
          }
        });
      });
    });

    describe('createScoreAchievements', () => {
      it('should create multiple score achievements with defaults', () => {
        const config = AchievementBuilder.createScoreAchievements([100, 500]);

        expect(config).toEqual({
          score: {
            100: {
              title: 'Score 100!',
              description: 'Score 100 points',
              icon: '🏆'
            },
            500: {
              title: 'Score 500!',
              description: 'Score 500 points',
              icon: '🏆'
            }
          }
        });
      });

      it('should create mixed achievements (some default, some custom)', () => {
        const config = AchievementBuilder.createScoreAchievements([
          100, // default
          [500, { title: 'High Scorer!', icon: '⭐' }], // custom
          1000 // default
        ]);

        expect(config).toEqual({
          score: {
            100: {
              title: 'Score 100!',
              description: 'Score 100 points',
              icon: '🏆'
            },
            500: {
              title: 'High Scorer!',
              description: 'Score 500 points',
              icon: '⭐'
            },
            1000: {
              title: 'Score 1000!',
              description: 'Score 1000 points',
              icon: '🏆'
            }
          }
        });
      });
    });

    describe('createLevelAchievement', () => {
      it('should create single level achievement with smart defaults', () => {
        const achievement = AchievementBuilder.createLevelAchievement(5);
        const config = achievement.toConfig();

        expect(config).toEqual({
          level: {
            5: {
              title: 'Level 5!',
              description: 'Reach level 5',
              icon: '📈'
            }
          }
        });
      });
    });

    describe('createLevelAchievements', () => {
      it('should create multiple level achievements', () => {
        const config = AchievementBuilder.createLevelAchievements([
          5,
          [10, { title: 'Expert!', icon: '🎯' }]
        ]);

        expect(config).toEqual({
          level: {
            5: {
              title: 'Level 5!',
              description: 'Reach level 5',
              icon: '📈'
            },
            10: {
              title: 'Expert!',
              description: 'Reach level 10',
              icon: '🎯'
            }
          }
        });
      });
    });

    describe('createBooleanAchievement', () => {
      it('should create boolean achievement with smart defaults', () => {
        const achievement = AchievementBuilder.createBooleanAchievement('completedTutorial');
        const config = achievement.toConfig();

        expect(config).toEqual({
          completedTutorial: {
            true: {
              title: 'Completed tutorial!',
              description: 'Complete completed tutorial',
              icon: '✅'
            }
          }
        });
      });

      it('should format camelCase metrics nicely', () => {
        const achievement = AchievementBuilder.createBooleanAchievement('firstLogin');
        const config = achievement.toConfig();

        expect(config).toEqual({
          firstLogin: {
            true: {
              title: 'First login!',
              description: 'Complete first login',
              icon: '✅'
            }
          }
        });
      });
    });

    describe('createValueAchievement', () => {
      it('should create value achievement with smart defaults', () => {
        const achievement = AchievementBuilder.createValueAchievement('characterClass', 'wizard');
        const config = achievement.toConfig();

        expect(config).toEqual({
          characterClass: {
            wizard: {
              title: 'Wizard!',
              description: 'Choose wizard for characterClass',
              icon: '🎯'
            }
          }
        });
      });
    });
  });

  describe('Tier 2: Chainable Customization', () => {

    describe('combine', () => {
      it('should combine multiple achievement configurations', () => {
        const scoreAchievement = AchievementBuilder.createScoreAchievement(100);
        const levelAchievement = AchievementBuilder.createLevelAchievement(5)
          .withAward({ title: 'Getting Started!', icon: '🌱' });

        const combined = AchievementBuilder.combine([scoreAchievement, levelAchievement]);

        expect(combined).toEqual({
          score: {
            100: {
              title: 'Score 100!',
              description: 'Score 100 points',
              icon: '🏆'
            }
          },
          level: {
            5: {
              title: 'Getting Started!',
              description: 'Reach level 5',
              icon: '🌱'
            }
          }
        });
      });

      it('should combine SimpleAchievementConfig objects', () => {
        const scoreConfig = AchievementBuilder.createScoreAchievements([100, 500]);
        const levelConfig = AchievementBuilder.createLevelAchievements([5, 10]);

        const combined = AchievementBuilder.combine([scoreConfig, levelConfig]);

        expect(combined.score).toBeDefined();
        expect(combined.level).toBeDefined();
        expect(combined.score![100]).toEqual({
          title: 'Score 100!',
          description: 'Score 100 points',
          icon: '🏆'
        });
        expect(combined.level![5]).toEqual({
          title: 'Level 5!',
          description: 'Reach level 5',
          icon: '📈'
        });
      });
    });
  });

  describe('Tier 3: Complex Builder', () => {

    describe('ComplexAchievementBuilder', () => {
      it('should create complex achievement with full control', () => {
        const config = AchievementBuilder.create()
          .withMetric('lastLoginDate')
          .withCondition((metrics) => {
            if (metrics.lastLoginDate instanceof Date) {
              return metrics.lastLoginDate.getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);
            }
            return false;
          })
          .withAward({
            title: 'Weekly Warrior',
            description: 'Logged in within the last week',
            icon: '📅'
          })
          .build();

        expect(config).toEqual({
          lastLoginDate: {
            custom: {
              title: 'Weekly Warrior',
              description: 'Logged in within the last week',
              icon: '📅',
              condition: expect.any(Function)
            }
          }
        });

        // Test the condition function (note: it now receives metrics object)
        const condition = (config.lastLoginDate.custom as CustomAchievementDetails).condition;
        expect(condition).toBeDefined();

        // Test with Date within 7 days
        const recentDate = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)); // 3 days ago
        expect(condition({ lastLoginDate: recentDate })).toBe(true);

        // Test with old Date
        const oldDate = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)); // 10 days ago
        expect(condition({ lastLoginDate: oldDate })).toBe(false);

        // Test with null
        expect(condition({ lastLoginDate: null })).toBe(false);
      });

      it('should support multi-metric conditions', () => {
        const config = AchievementBuilder.create()
          .withMetric('power_player') // config key
          .withCondition((metrics) => {
            return metrics.score >= 1000 && metrics.level >= 10;
          })
          .withAward({ title: 'Power Player', icon: '💪' })
          .build();

        expect(config.power_player).toBeDefined();
        expect(config.power_player.custom).toBeDefined();

        const condition = (config.power_player.custom as CustomAchievementDetails).condition;
        expect(condition).toBeDefined();

        // Test cases for the multi-metric condition
        expect(condition({ score: 1000, level: 10 })).toBe(true);
        expect(condition({ score: 1500, level: 20 })).toBe(true);
        expect(condition({ score: 999, level: 10 })).toBe(false);
        expect(condition({ score: 1000, level: 9 })).toBe(false);
        expect(condition({ score: 500, level: 5 })).toBe(false);
        expect(condition({})).toBe(false);
      });

      it('should support percentage-based conditions', () => {
        const config = AchievementBuilder.create()
          .withMetric('quest_completion')
          .withCondition((metrics) => {
            if (typeof metrics.questsCompleted !== 'number' || typeof metrics.totalQuests !== 'number' || metrics.totalQuests === 0) {
              return false;
            }
            return metrics.questsCompleted >= metrics.totalQuests * 0.5;
          })
          .withAward({ title: 'Halfway There' })
          .build();

        const condition = (config.quest_completion.custom as CustomAchievementDetails).condition;
        expect(condition).toBeDefined();

        expect(condition({ questsCompleted: 5, totalQuests: 10 })).toBe(true);
        expect(condition({ questsCompleted: 6, totalQuests: 10 })).toBe(true);
        expect(condition({ questsCompleted: 4, totalQuests: 10 })).toBe(false);
        expect(condition({ questsCompleted: 50, totalQuests: 100 })).toBe(true);
        expect(condition({ questsCompleted: 0, totalQuests: 10 })).toBe(false);
        expect(condition({ questsCompleted: 10, totalQuests: 0 })).toBe(false);
        expect(condition({})).toBe(false);
      });

      it('should throw error if required fields are missing', () => {
        expect(() => {
          AchievementBuilder.create().build();
        }).toThrow('Complex achievement requires metric and condition');
      });

      it('should use default values when award details are not provided', () => {
        const config = AchievementBuilder.create()
          .withMetric('testMetric')
          .withCondition(() => true)
          .build();

        expect(config).toEqual({
          testMetric: {
            custom: {
              title: 'testMetric',
              description: 'Achieve testMetric',
              icon: '💎',
              condition: expect.any(Function)
            }
          }
        });
      });
    });
  });
});

describe('Complete Example from Docs', () => {
  it('should correctly combine all three tiers of the AchievementBuilder', () => {
    const achievements = AchievementBuilder.combine([
      // Tier 1: Smart defaults
      AchievementBuilder.createScoreAchievements([100, 500]),
      AchievementBuilder.createLevelAchievements([5, 10]),

      // Tier 2: Chainable customization
      AchievementBuilder.createScoreAchievement(1000)
        .withAward({ title: 'Master Scorer!', icon: '🏆' }),

      AchievementBuilder.createBooleanAchievement('completedTutorial')
        .withAward({ title: 'Quick Learner!', icon: '📚' }),

      // Tier 3: Full control
      AchievementBuilder.create()
        .withMetric('perfect_combo')
        .withCondition((metrics) => {
          return metrics.score >= 500 && metrics.level >= 5;
        })
        .withAward({
          title: 'Perfect Combo',
          description: 'Score 500+ at level 5+',
          icon: '⚡'
        })
        .build()
    ]);

    // Tier 1 assertions
    expect(achievements.score?.[100].title).toBe('Score 100!');
    expect(achievements.score?.[500].title).toBe('Score 500!');
    expect(achievements.level?.[5].title).toBe('Level 5!');
    expect(achievements.level?.[10].title).toBe('Level 10!');

    // Tier 2 assertions
    expect(achievements.score?.[1000].title).toBe('Master Scorer!');
    expect(achievements.completedTutorial?.['true'].title).toBe('Quick Learner!');

    // Tier 3 assertions
    const perfectCombo = achievements.perfect_combo as { custom: CustomAchievementDetails };
    expect(perfectCombo.custom.title).toBe('Perfect Combo');
    const condition = perfectCombo.custom.condition;
    expect(condition).toBeInstanceOf(Function);
    if (condition) {
      expect(condition({ score: 500, level: 5 })).toBe(true);
      expect(condition({ score: 499, level: 5 })).toBe(false);
      expect(condition({ score: 500, level: 4 })).toBe(false);
    }
  });
});