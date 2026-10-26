package com.runeprofile.itemicons;

import java.io.File;
import javax.imageio.ImageIO;
import net.runelite.cache.SpriteManager;
import net.runelite.cache.definitions.SpriteDefinition;
import net.runelite.cache.fs.Store;

/**
 * Writes the four spellbook side-icons from the game cache as standard/ancient/lunar/arceuus.png.
 * These are the same sprites Inventory Setups draws for its spellbook picker
 * (SpriteID.SideiconsInterface.MAGIC, SPELLBOOK_ANCIENT_MAGICKS, SPELLBOOK_LUNAR, SPELLBOOK_ARCEUUS),
 * frame 0. Run like DumpItemNames:
 *   ./gradlew run -PmainClass=com.runeprofile.itemicons.DumpSpellbookIcons --args="<cacheDir> <outDir>"
 */
public class DumpSpellbookIcons
{
	// Order matches Inventory Setups' spellbook numbering (0 standard, 1 ancient, 2 lunar, 3 arceuus).
	private static final String[] NAMES = {"standard", "ancient", "lunar", "arceuus"};
	private static final int[] SPRITE_IDS = {780, 1583, 1584, 1711};

	public static void main(String[] args) throws Exception
	{
		File cacheDir = new File(args[0]);
		File outDir = new File(args[1]);
		outDir.mkdirs();

		try (Store store = new Store(cacheDir))
		{
			store.load();
			SpriteManager sprites = new SpriteManager(store);
			sprites.load();
			for (int i = 0; i < NAMES.length; i++)
			{
				SpriteDefinition def = sprites.findSprite(SPRITE_IDS[i], 0);
				if (def == null || def.getWidth() <= 0 || def.getHeight() <= 0)
				{
					throw new IllegalStateException("Sprite " + SPRITE_IDS[i] + " (" + NAMES[i] + ") not found in cache");
				}
				ImageIO.write(sprites.getSpriteImage(def), "png", new File(outDir, NAMES[i] + ".png"));
				System.out.println("Wrote " + NAMES[i] + ".png (" + def.getWidth() + "x" + def.getHeight() + ")");
			}
		}
	}
}
