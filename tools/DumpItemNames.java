package com.runeprofile.itemicons;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.File;
import java.io.FileWriter;
import java.io.Writer;
import java.util.Map;
import java.util.TreeMap;
import net.runelite.cache.ItemManager;
import net.runelite.cache.definitions.ItemDefinition;
import net.runelite.cache.fs.Store;

/**
 * Writes {"<itemId>": "<name>", ...} for every named item in an OSRS disk-store cache.
 * Output is one entry per line, sorted by item id, with no HTML escaping, so a git diff between
 * two cache versions shows only the items that actually changed.
 * Copied into RuneProfile's scripts/item-icons source tree by the workflow and run with
 *   ./gradlew run -PmainClass=com.runeprofile.itemicons.DumpItemNames --args="<cacheDir> <out.json>"
 * (their build.gradle supports -PmainClass for exactly this).
 */
public class DumpItemNames
{
	public static void main(String[] args) throws Exception
	{
		File cacheDir = new File(args[0]);
		File out = new File(args[1]);

		Map<Integer, String> names = new TreeMap<>();
		try (Store store = new Store(cacheDir))
		{
			store.load();
			ItemManager items = new ItemManager(store);
			items.load();
			// Noted, placeholder and "bought" variants only get their name by linking to the base item.
			items.link();
			for (ItemDefinition def : items.getItems())
			{
				if (def.name != null && !def.name.isEmpty() && !def.name.equals("null"))
				{
					names.put(def.id, def.name);
				}
			}
		}

		try (Writer w = new FileWriter(out))
		{
			// By default Gson writes ' < > & = as numeric unicode escapes (meant for HTML embedding); just noise here.
			Gson gson = new GsonBuilder().disableHtmlEscaping().setPrettyPrinting().create();
			gson.toJson(names, w);
			w.write("\n");
		}
		System.out.println("Wrote " + names.size() + " item names to " + out);
	}
}
