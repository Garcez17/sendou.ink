import type {
  BuildAbilitiesTupleWithUnknown,
  MainWeaponId,
} from "~/modules/in-game-lists";
import type {
  AnalyzedBuild,
  InkConsumeType,
  MainWeaponParams,
  StatFunctionInput,
} from "./types";
import { INK_CONSUME_TYPES } from "./types";
import invariant from "tiny-invariant";
import {
  abilityPointsToEffects,
  apFromMap,
  buildToAbilityPoints,
  weaponParams,
} from "./utils";
import { assertUnreachable } from "~/utils/types";

export function buildStats({
  build,
  weaponSplId,
}: {
  build: BuildAbilitiesTupleWithUnknown;
  weaponSplId: MainWeaponId;
}): AnalyzedBuild {
  const mainWeaponParams = weaponParams().mainWeapons[weaponSplId];
  invariant(mainWeaponParams, `Weapon with splId ${weaponSplId} not found`);

  const subWeaponParams =
    weaponParams().subWeapons[mainWeaponParams.subWeaponId];
  invariant(
    subWeaponParams,
    `Sub weapon with splId ${mainWeaponParams.subWeaponId} not found`
  );

  const input: StatFunctionInput = {
    mainWeaponParams,
    subWeaponParams,
    abilityPoints: buildToAbilityPoints(build),
  };

  return {
    weapon: {
      subWeaponSplId: mainWeaponParams.subWeaponId,
      specialWeaponSplId: mainWeaponParams.specialWeaponId,
    },
    stats: {
      specialPoint: specialPoint(input),
      specialSavedAfterDeath: specialSavedAfterDeath(input),
      fullInkTankOptions: fullInkTankOptions(input),
      subWeaponWhiteInkFrames: subWeaponParams.InkRecoverStop,
    },
  };
}

function specialPoint({
  abilityPoints,
  mainWeaponParams,
}: StatFunctionInput): AnalyzedBuild["stats"]["specialPoint"] {
  const SPECIAL_POINT_ABILITY = "SCU";

  const { effect } = abilityPointsToEffects({
    abilityPoints: apFromMap({
      abilityPoints: abilityPoints,
      ability: SPECIAL_POINT_ABILITY,
    }),
    key: "IncreaseRt_Special",
    weapon: mainWeaponParams,
  });

  return {
    baseValue: mainWeaponParams.SpecialPoint,
    modifiedBy: SPECIAL_POINT_ABILITY,
    value: Math.ceil(mainWeaponParams.SpecialPoint / effect),
  };
}

function specialSavedAfterDeath({
  abilityPoints,
  mainWeaponParams,
}: StatFunctionInput): AnalyzedBuild["stats"]["specialPoint"] {
  const SPECIAL_SAVED_AFTER_DEATH_ABILITY = "SS";
  const specialSavedAfterDeathForDisplay = (effect: number) =>
    Number(((1.0 - effect) * 100).toFixed(2));

  const { baseEffect, effect } = abilityPointsToEffects({
    abilityPoints: apFromMap({
      abilityPoints: abilityPoints,
      ability: SPECIAL_SAVED_AFTER_DEATH_ABILITY,
    }),
    key: "SpecialGaugeRt_Restart",
    weapon: mainWeaponParams,
  });

  return {
    baseValue: specialSavedAfterDeathForDisplay(baseEffect),
    value: specialSavedAfterDeathForDisplay(effect),
    modifiedBy: SPECIAL_SAVED_AFTER_DEATH_ABILITY,
  };
}

function fullInkTankOptions(
  args: StatFunctionInput
): AnalyzedBuild["stats"]["fullInkTankOptions"] {
  const result: AnalyzedBuild["stats"]["fullInkTankOptions"] = [];

  const { inkConsume: subWeaponInkConsume, maxSubsFromFullInkTank } =
    subWeaponConsume(args);

  for (
    let subsFromFullInkTank = 0;
    subsFromFullInkTank <= maxSubsFromFullInkTank;
    subsFromFullInkTank++
  ) {
    for (const type of INK_CONSUME_TYPES) {
      const mainWeaponInkConsume = mainWeaponInkConsumeByType({
        type,
        ...args,
      });

      if (typeof mainWeaponInkConsume !== "number") continue;

      result.push({
        subsUsed: subsFromFullInkTank,
        type,
        value: effectToRounded(
          (1 - subWeaponInkConsume * subsFromFullInkTank) / mainWeaponInkConsume
        ),
      });
    }
  }

  return result;
}

function effectToRounded(effect: number) {
  return Number(effect.toFixed(2));
}

function subWeaponConsume({
  mainWeaponParams,
  subWeaponParams,
  abilityPoints,
}: StatFunctionInput) {
  const { effect } = abilityPointsToEffects({
    abilityPoints: apFromMap({
      abilityPoints,
      ability: "ISS",
    }),
    // xxx: placeholder fallback before prod
    key: `ConsumeRt_Sub_Lv${subWeaponParams.SubInkSaveLv ?? 0}`,
    weapon: mainWeaponParams,
  });

  // xxx: placeholder fallback before prod
  const inkConsume = subWeaponParams.InkConsume ?? 0.6;

  const inkConsumeAfterISS = inkConsume * effect;

  return {
    inkConsume: inkConsumeAfterISS,
    maxSubsFromFullInkTank: Math.floor(1 / inkConsumeAfterISS),
  };
}

function mainWeaponInkConsumeByType({
  mainWeaponParams,
  abilityPoints,
  type,
}: {
  type: InkConsumeType;
} & StatFunctionInput) {
  const { effect } = abilityPointsToEffects({
    abilityPoints: apFromMap({
      abilityPoints,
      ability: "ISM",
    }),
    key: "ConsumeRt_Main",
    weapon: mainWeaponParams,
  });

  // these keys are always mutually exclusive i.e. even if inkConsumeTypeToParamsKeys() returns many keys
  // then weapon params of this weapon should only have one defined
  for (const key of inkConsumeTypeToParamsKeys(type)) {
    const value = mainWeaponParams[key];

    if (typeof value === "number") {
      return value * effect;
    }
  }

  // not all weapons have all ink consume types
  // i.e. blaster does not (hopefully) perform dualie dodge rolls
  return;
}

function inkConsumeTypeToParamsKeys(
  type: InkConsumeType
): Array<keyof MainWeaponParams> {
  switch (type) {
    case "NORMAL":
      return ["InkConsume"];
    case "SWING":
      return ["InkConsume_SwingParam", "InkConsume_WeaponSwingParam"];
    case "TAP_SHOT":
      return ["InkConsumeMinCharge", "InkConsumeMinCharge_ChargeParam"];
    case "FULL_CHARGE":
      return ["InkConsumeFullCharge", "InkConsumeFullCharge_ChargeParam"];
    case "HORIZONTAL_SWING":
      return ["InkConsume_WeaponWideSwingParam"];
    case "VERTICAL_SWING":
      return ["InkConsume_WeaponVerticalSwingParam"];
    case "DUALIE_ROLL":
      return ["InkConsume_SideStepParam"];
    case "SHIELD_LAUNCH":
      return ["InkConsumeUmbrella_WeaponShelterCanopyParam"];
    case "ROLL_MAX":
      return ["InkConsumeMaxPerFrame_WeaponRollParam"];
    case "ROLL_MIN":
      return ["InkConsumeMinPerFrame_WeaponRollParam"];
    default: {
      assertUnreachable(type);
    }
  }
}
