"""Render the SKS indexing-carousel transition as a locked 2.5D Blender shot.

The accepted empty laboratory plate stays fixed. Four genuine-alpha stand
sprites and four exact client board renders move as rigid parented pairs around
one shallow indexing path. This avoids the geometry drift and camera zoom that
appeared in generated video while keeping the result visually identical to the
site's existing laboratory scene.

Run control frames first:

    Blender --background --python scripts/blender-gallery-transition-2d.py

Render the two-second right-arrow MP4 only after those frames are approved:

    Blender --background --python scripts/blender-gallery-transition-2d.py -- --animation
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "public/assets/video/blender-gallery-right-v2"
BACKGROUND_PATH = PROJECT_ROOT / "public/assets/images/sections/selector-carousel-clean.png"
STAND_PATH = PROJECT_ROOT / "public/assets/images/sections/selector-turntable-sprite.png"
BOARDS_DIR = PROJECT_ROOT / "public/assets/images/boards"
BLEND_PATH = OUTPUT_DIR / "gallery-carousel-right-v2.blend"
VIDEO_PATH = OUTPUT_DIR / "gallery-carousel-right-v2.mp4"
FRAME_DIR = OUTPUT_DIR / "frames"

FRAME_START = 1
FRAME_END = 61
FPS = 30
CONTROL_FRAMES = (1, 31, 61)
RENDER_ANIMATION = "--animation" in sys.argv


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.cameras,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def image_material(name: str, path: Path, alpha: bool) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Strength"].default_value = 1.0
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(str(path), check_existing=True)
    texture.interpolation = "Linear"
    links.new(texture.outputs["Color"], emission.inputs["Color"])

    if alpha:
        transparent = nodes.new("ShaderNodeBsdfTransparent")
        mix = nodes.new("ShaderNodeMixShader")
        links.new(texture.outputs["Alpha"], mix.inputs[0])
        links.new(transparent.outputs[0], mix.inputs[1])
        links.new(emission.outputs[0], mix.inputs[2])
        links.new(mix.outputs[0], output.inputs[0])
        if hasattr(material, "surface_render_method"):
            material.surface_render_method = "DITHERED"
    else:
        links.new(emission.outputs[0], output.inputs[0])
    return material


def add_image_plane(
    name: str,
    material: bpy.types.Material,
    width: float,
    height: float,
    location: tuple[float, float, float],
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=2, location=location)
    plane = bpy.context.object
    plane.name = name
    plane.scale = (width * 0.5, height * 0.5, 1)
    plane.data.materials.append(material)
    return plane


def smoothstep(value: float) -> float:
    return value * value * (3.0 - 2.0 * value)


def projected_position(angle: float) -> tuple[float, float, float, float]:
    """Return screen x/y, perspective scale and layer depth for one angle."""
    sine = math.sin(angle)
    x = 4.18 * math.cos(angle)
    y = -0.62 + 1.55 * sine
    scale = 0.68 - 0.32 * sine
    depth = 1.1 + 2.0 * scale
    return x, y, scale, depth


def animate_pair(root: bpy.types.Object, start_angle: float) -> None:
    for frame in range(FRAME_START, FRAME_END + 1):
        progress = (frame - FRAME_START) / (FRAME_END - FRAME_START)
        eased = smoothstep(progress)
        angle = start_angle - (math.pi / 2) * eased
        x, y, scale, depth = projected_position(angle)
        root.location = (x, y, depth)
        root.scale = (scale, scale, 1)
        root.keyframe_insert(data_path="location", frame=frame)
        root.keyframe_insert(data_path="scale", frame=frame)


def build_pair(
    name: str,
    board_path: Path,
    start_angle: float,
    board_rotation: float,
    stand_material: bpy.types.Material,
) -> None:
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)

    stand = add_image_plane(
        f"{name} stand",
        stand_material,
        width=5.15,
        height=2.90,
        location=(0, 0, 0),
    )
    stand.parent = root

    board_material = image_material(f"{name} board material", board_path, alpha=True)
    board = add_image_plane(
        f"{name} board",
        board_material,
        width=3.28,
        height=3.28,
        location=(0, 0.72, 0.035),
    )
    board.rotation_euler.z = math.radians(board_rotation)
    board.parent = root

    animate_pair(root, start_angle)


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    scene = bpy.context.scene
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.render.fps = FPS
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0, 0, 0, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0

    background_material = image_material("Accepted empty laboratory", BACKGROUND_PATH, alpha=False)
    # Source is slightly taller than 16:9, so this is a deliberate cover crop.
    add_image_plane(
        "Locked laboratory plate",
        background_material,
        width=12.80,
        height=8.01,
        location=(0, 0, 0),
    )

    stand_material = image_material("Exact stand sprite", STAND_PATH, alpha=True)
    pairs = (
        (
            "Flight controller",
            BOARDS_DIR / "flight-controller-transparent.webp",
            -math.pi / 2,
            -7.0,
        ),
        ("CAN to PWM", BOARDS_DIR / "can-to-pwm-transparent.webp", 0.0, 5.0),
        ("ICM 42605", BOARDS_DIR / "icm-42605-transparent.webp", math.pi / 2, -2.0),
        (
            "Power distribution",
            BOARDS_DIR / "power-distribution-transparent.webp",
            math.pi,
            3.0,
        ),
    )
    for name, board_path, angle, rotation in pairs:
        build_pair(name, board_path, angle, rotation, stand_material)

    camera_data = bpy.data.cameras.new("Locked orthographic camera")
    camera = bpy.data.objects.new("Locked orthographic camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, 0, 10)
    camera_data.type = "ORTHO"
    # Blender's orthographic scale is the horizontal camera width here. A
    # 12.8-unit view maps one world unit to 100 px at the 1280 px output.
    camera_data.ortho_scale = 12.80
    scene.camera = camera

    scene.frame_set(FRAME_START)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))


def render() -> None:
    scene = bpy.context.scene
    if RENDER_ANIMATION:
        # The Blender 5.2 LTS build on this Mac has no bundled FFmpeg output.
        # Render a lossless sequence here; the project-level ffmpeg command
        # encodes it to H.264 after Blender exits.
        FRAME_DIR.mkdir(parents=True, exist_ok=True)
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = str(FRAME_DIR / "gallery-carousel-right-v2-")
        bpy.ops.render.render(animation=True)
        return

    for frame in CONTROL_FRAMES:
        scene.frame_set(frame)
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = str(OUTPUT_DIR / f"gallery-carousel-right-v2-frame-{frame:03d}.png")
        bpy.ops.render.render(write_still=True)


build_scene()
render()
