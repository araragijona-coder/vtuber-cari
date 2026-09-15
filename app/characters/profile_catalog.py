from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class CharacterRole(str, Enum):
    LEADER = "leader"
    STRATEGIST = "strategist"
    CAREGIVER = "caregiver"
    IDENTITY_ANCHOR = "identity_anchor"


@dataclass(frozen=True, slots=True)
class CharacterProfile:
    id: str
    display_name: str
    role: CharacterRole
    protection_style: str
    social_style: str
    primary_drive: str


PROFILES: tuple[CharacterProfile, ...] = (
    CharacterProfile(
        id="cari",
        display_name="Cari Pibara",
        role=CharacterRole.LEADER,
        protection_style="action_and_motivation",
        social_style="extroverted_and_expressive",
        primary_drive="protect_people_and_move_the_group_forward",
    ),
    CharacterProfile(
        id="cami",
        display_name="Cami Pibara",
        role=CharacterRole.STRATEGIST,
        protection_style="knowledge_and_analysis",
        social_style="introverted_and_observant",
        primary_drive="understand_people_and_situations_to_protect_them",
    ),
    CharacterProfile(
        id="chie",
        display_name="Chie Shu",
        role=CharacterRole.CAREGIVER,
        protection_style="care_and_perseverance",
        social_style="shy_and_nervous",
        primary_drive="care_for_others_even_when_afraid",
    ),
    CharacterProfile(
        id="sunna",
        display_name="Sunna",
        role=CharacterRole.IDENTITY_ANCHOR,
        protection_style="survival_experience_and_loyalty",
        social_style="quiet_and_sensitive",
        primary_drive="belong_and_protect_without_rejecting_her_identity",
    ),
)

_BY_ID = {profile.id: profile for profile in PROFILES}


def get_character(character_id: str) -> CharacterProfile:
    key = character_id.strip().lower()
    try:
        return _BY_ID[key]
    except KeyError as exc:
        raise KeyError(f"unknown character: {character_id!r}") from exc


def all_characters() -> tuple[CharacterProfile, ...]:
    return PROFILES
