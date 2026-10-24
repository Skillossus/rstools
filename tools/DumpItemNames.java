package com.runeprofile.itemicons;

import com.google.gson.Gson;
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
			new Gson().toJson(names, w);
		}
		System.out.println("Wrote " + names.size() + " item names to " + out);
	}
}
