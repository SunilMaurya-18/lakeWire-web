"use client";

import { useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { PerspectiveCamera, Vector3 } from "three";
import { Bench } from "@/components/three/bench";
import { Shelf } from "@/components/three/shelf";
import { City } from "@/components/three/city";
import { JourneyWorld } from "@/components/three/journey";
import { Cluster } from "@/components/three/cluster";
import { Lake } from "@/components/three/lake";
import { Tiles } from "@/components/three/tiles";
import { Waterfall } from "@/components/three/waterfall";
import { Wordmark } from "@/components/three/wordmark";
import { explore, focus, gapScroll, systemScroll } from "@/lib/explore";
import { costPose, costScroll } from "@/lib/cost";
import { hubPose, hubScroll } from "@/lib/library";
import { journeyPose, journeyScroll } from "@/lib/journey";
import { smoothstep, visualProgress } from "@/lib/problem";
import { dprFor } from "@/lib/tier";
import { useLake, type DeviceTier } from "@/store/lake";

const order: DeviceTier[] = ["high", "mid", "low"];
const loaderPos = new Vector3(0, 0.08, 6.2);
const desktopPos = new Vector3(0.15, 2.05, 6.5);
const mobilePos = new Vector3(0, 4.1, 11.2);
const loaderLook = new Vector3(0, 0, 0);
const desktopLook = new Vector3(0, 0.45, -0.45);
const mobileLook = new Vector3(0, 1.25, -0.3);
const look = new Vector3();
const desired = new Vector3();
const aim = new Vector3();
const deskUnder = new Vector3(1.7, -5.85, 6.5);
const deskUnderLook = new Vector3(0, -6.4, -0.2);
const deskClose = new Vector3(1.05, -6.85, 7.2);
const deskCloseLook = new Vector3(0, -7.45, -0.1);
const mobUnder = new Vector3(0.2, -5.15, 12.8);
const mobUnderLook = new Vector3(0, -6.15, 0);
const mobClose = new Vector3(0, -8.7, 9.6);
const mobCloseLook = new Vector3(0, -9.9, 0);
const gapDesk = new Vector3(0.2, -2.05, -8.4);
const gapDeskLook = new Vector3(0, -6.4, -16);
const gapMob = new Vector3(0, -5.35, -9.2);
const gapMobLook = new Vector3(0, -6.35, -16);
const sysDesk = new Vector3(8.6, -2.2, -25.2);
const sysDeskLook = new Vector3(0, -7.6, -34);
const cityLook = new Vector3(0, -7.55, -34);
const orbitPos = new Vector3();
const jPos = new Vector3();
const jAim = new Vector3();
const cPos = new Vector3();
const cAim = new Vector3();
const hPos = new Vector3();
const hAim = new Vector3();

function CameraRig() {
  const camera = useThree((state) => state.camera);
  useFrame(() => {
    const { pointer, loaded, falling, reduced, mobile } = useLake.getState();
    const framed = falling || loaded;
    const heroPosition = framed ? (mobile ? mobilePos : desktopPos) : loaderPos;
    const heroAim = framed ? (mobile ? mobileLook : desktopLook) : loaderLook;
    const p = framed ? visualProgress(reduced) : 0;
    const dive = smoothstep(0.02, 0.16, p);
    const push = smoothstep(0.62, 1, p);
    const underPosition = mobile ? mobUnder : deskUnder;
    const underAim = mobile ? mobUnderLook : deskUnderLook;
    const closePosition = mobile ? mobClose : deskClose;
    const closeAim = mobile ? mobCloseLook : deskCloseLook;
    desired.copy(heroPosition).lerp(underPosition, dive);
    desired.lerp(closePosition, push);
    aim.copy(heroAim).lerp(underAim, dive);
    aim.lerp(closeAim, push);
    const gapP = framed ? gapScroll.p : 0;
    const systemP = framed ? systemScroll.p : 0;
    desired.lerp(mobile ? gapMob : gapDesk, gapP);
    aim.lerp(mobile ? gapMobLook : gapDeskLook, gapP);
    if (mobile) {
      const cp = Math.cos(explore.orbitPitch);
      orbitPos.set(
        cityLook.x + Math.sin(explore.orbitYaw) * cp * explore.orbitRadius,
        cityLook.y + Math.sin(explore.orbitPitch) * explore.orbitRadius,
        cityLook.z + Math.cos(explore.orbitYaw) * cp * explore.orbitRadius,
      );
    }
    desired.lerp(mobile ? orbitPos : sysDesk, systemP);
    aim.lerp(mobile ? cityLook : sysDeskLook, systemP);
    if (focus.active) {
      desired.copy(focus.position);
      aim.copy(focus.look);
    }
    const sway = loaded && !reduced && p < 0.04 && gapP < 0.05 && systemP < 0.05 && journeyScroll.p < 0.02;
    desired.x += sway ? pointer.x * 0.22 : 0;
    desired.y += sway ? pointer.y * 0.1 : 0;
    const journeyBlend = smoothstep(0, 0.07, framed ? journeyScroll.p : 0);
    if (journeyBlend > 0) {
      journeyPose(journeyScroll.p, mobile, jPos, jAim);
      desired.lerp(jPos, journeyBlend);
      aim.lerp(jAim, journeyBlend);
    }
    const costBlend = smoothstep(0, 0.14, framed ? costScroll.p : 0);
    if (costBlend > 0) {
      costPose(mobile, cPos, cAim);
      desired.lerp(cPos, costBlend);
      aim.lerp(cAim, costBlend);
    }
    const hubBlend = smoothstep(0, 0.22, framed ? hubScroll.p : 0);
    if (hubBlend > 0) {
      hubPose(mobile, hPos, hAim);
      desired.lerp(hPos, hubBlend);
      aim.lerp(hAim, hubBlend);
    }
    camera.position.x += (desired.x - camera.position.x) * 0.08;
    camera.position.y += (desired.y - camera.position.y) * 0.08;
    camera.position.z += (desired.z - camera.position.z) * 0.08;
    look.lerp(aim, 0.08);
    camera.lookAt(look);
    if (camera instanceof PerspectiveCamera) {
      const fov = mobile ? (loaded ? 50 : 52) : 42;
      if (Math.abs(camera.fov - fov) > 0.2) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}

function Quality() {
  const gl = useThree((state) => state.gl);
  const tier = useLake((state) => state.deviceTier);
  const mobile = useLake((state) => state.mobile);
  useLayoutEffect(() => {
    gl.setPixelRatio(dprFor(tier, mobile));
  }, [gl, tier, mobile]);

  return (
    <PerformanceMonitor
      ms={200}
      iterations={6}
      flipflops={3}
      onDecline={() => {
        const current = useLake.getState().deviceTier;
        const index = order.indexOf(current);
        if (index < order.length - 1) useLake.getState().setDeviceTier(order[index + 1]);
        gl.setPixelRatio(Math.max(1, gl.getPixelRatio() * 0.8));
      }}
    />
  );
}

export function World() {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <Quality />
      <CameraRig />
      <Lake />
      <Waterfall />
      <Cluster />
      <Tiles />
      <City />
      <JourneyWorld />
      <Bench />
      <Shelf />
      <Wordmark />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.18} luminanceThreshold={0.94} mipmapBlur />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.18} darkness={0.72} />
      </EffectComposer>
    </>
  );
}
