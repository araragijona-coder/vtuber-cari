import unittest

from app.avatar.behavior import AvatarBehaviorDirector, BehaviorState
from app.avatar.idle import IdleMicroBehaviorScheduler
from app.avatar.motion import MotionDirector, MotionPose
from app.avatar.reactions import Reaction, ReactionScheduler
from app.core.events import EventBus
from app.core.lifecycle import Lifecycle, LifecycleManager
from app.resources.quality import QualityGovernor, QualityLevel
from app.scene import AttentionDirector, AttentionPoint, AttentionTarget, SceneComposer, SceneDirector, RenderCache, RenderPlan, LayerFingerprint


class SceneAndAvatarDesignTests(unittest.TestCase):
    def test_motion_is_normalized(self):
        pose = MotionDirector().set_pose(MotionPose(x=2, y=-1, scale=9, rotation=90))
        self.assertEqual((pose.x, pose.y, pose.scale, pose.rotation), (1.0, 0.0, 3.0, 45.0))

    def test_scene_avoids_reserved_zone(self):
        director = SceneDirector()
        director.reserve(__import__('app.scene', fromlist=['StageReservation']).StageReservation('alert', 'center', 10))
        self.assertNotEqual(director.choose_zone().name, 'center')

    def test_attention_is_normalized(self):
        attention = AttentionDirector().focus(AttentionPoint(AttentionTarget.CHAT, 2, -1))
        self.assertEqual((attention.x, attention.y), (1.0, 0.0))

    def test_render_cache_is_stable(self):
        cache = RenderCache()
        plan = RenderPlan((LayerFingerprint('avatar', 'a'),))
        cache.put(plan)
        self.assertIs(cache.get(plan), plan)

    def test_reaction_cooldown(self):
        scheduler = ReactionScheduler()
        reaction = Reaction('blink', 'blink', cooldown=60)
        self.assertTrue(scheduler.submit(reaction))
        self.assertFalse(scheduler.submit(reaction))

    def test_behavior_is_semantic(self):
        cue = AvatarBehaviorDirector().cue(BehaviorState.SPEAKING, emotion='happy')
        self.assertEqual(cue.animation, 'talk')
        self.assertEqual(cue.emotion, 'happy')

    def test_idle_can_be_suppressed(self):
        scheduler = IdleMicroBehaviorScheduler()
        self.assertIsNone(scheduler.tick(allow=False, now=10_000))

    def test_quality_eco_disables_idle(self):
        governor = QualityGovernor(QualityLevel.ECO)
        self.assertFalse(governor.allow_idle_microbehaviors)

    def test_event_bus(self):
        bus = EventBus()
        seen = []
        bus.subscribe('x', seen.append)
        self.assertEqual(bus.publish('x', 42), 1)
        self.assertEqual(seen, [42])

    def test_lifecycle_rejects_invalid_transition(self):
        manager = LifecycleManager()
        manager.transition(Lifecycle.STARTING)
        manager.transition(Lifecycle.READY)
        with self.assertRaises(ValueError):
            manager.transition(Lifecycle.OFF)

    def test_composer_produces_renderer_neutral_frame(self):
        composer = SceneComposer()
        attention = AttentionPoint(AttentionTarget.SPECTATOR)
        frame = composer.compose(MotionPose(), attention)
        self.assertEqual([layer.kind for layer in frame.layers], ['avatar', 'attention'])


if __name__ == '__main__':
    unittest.main()
