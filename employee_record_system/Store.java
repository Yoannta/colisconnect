import java.io.*;
import java.util.ArrayList;

/**
 * Name: TODO
 * Student Number: TODO
 *
 * Stores a fixed-size list of employees.
 */
public class Store
{
    private static int MAXSIZE;
    private static int count;
    Person[] list;

    /**
     * Getter method to return the number of elements currently in store.
     *
     * @return number of stored employees
     */
    public static int getCount()
    {
        return count;
    }

    /**
     * Returns true if no more space in store.
     *
     * @return true when store is full
     */
    public static boolean isFull()
    {
        return count >= MAXSIZE;
    }

    /**
     * Default constructor.
     */
    public Store()
    {
        this(100);
    }

    /**
     * Constructor which allows the size of the store to be specified.
     *
     * @param size maximum number of employees
     */
    public Store(int size)
    {
        MAXSIZE = size;
        count = 0;
        list = new Person[MAXSIZE];
    }

    /**
     * Create a Store from another Store s.
     *
     * @param s store to clone
     */
    public Store(Store s)
    {
        if (s == null)
        {
            MAXSIZE = 100;
            count = 0;
            list = new Person[MAXSIZE];
        }
        else
        {
            int sourceCount = count;
            Person[] sourceList = s.list;
            MAXSIZE = sourceList.length;
            count = 0;
            list = new Person[MAXSIZE];

            for (int i = 0; i < sourceCount; i++)
            {
                add(new Employee((Employee) sourceList[i]));
            }
        }
    }

    /**
     * Method to add Employee p to array.
     *
     * @param p employee to add
     */
    public void add(Employee p)
    {
        if (!isFull() && p != null)
        {
            list[count] = new Employee(p);
            count++;
        }
    }

    /**
     * Display the contents of store on screen.
     */
    public void displayAll()
    {
        for (int i = 0; i < count; i++)
        {
            System.out.println(list[i]);
            System.out.println();
        }
    }

    /**
     * Returns the current number of employees.
     *
     * @return number of employees
     */
    public int size()
    {
        return count;
    }

    /**
     * Gets the employee at a selected position.
     *
     * @param index employee position
     * @return cloned employee
     */
    public Employee get(int index)
    {
        if (index < 0 || index >= count)
        {
            return null;
        }
        return new Employee((Employee) list[index]);
    }

    /**
     * Removes the employee at a selected position.
     *
     * @param index employee position
     * @return true when an employee was removed
     */
    public boolean remove(int index)
    {
        if (index < 0 || index >= count)
        {
            return false;
        }

        for (int i = index; i < count - 1; i++)
        {
            list[i] = list[i + 1];
        }
        list[count - 1] = null;
        count--;
        return true;
    }

    /**
     * Saves this store as a CSV text file.
     *
     * @param file output file
     * @throws IOException when the file cannot be written
     */
    public void saveToFile(File file) throws IOException
    {
        PrintWriter out = new PrintWriter(new FileWriter(file));
        out.println("id,name,gender,dateOfBirth,address,nationalInsuranceNo,phoneNo,startDate,jobTitle,salary");

        for (int i = 0; i < count; i++)
        {
            Employee e = (Employee) list[i];
            out.println(toCsv(e.getId()) + ","
                + toCsv(e.getName()) + ","
                + toCsv(String.valueOf(e.getGender())) + ","
                + toCsv(e.getDateOfBirth().toString()) + ","
                + toCsv(e.getAddress()) + ","
                + toCsv(e.getNatInsNo()) + ","
                + toCsv(e.getPhone()) + ","
                + toCsv(e.getStart().toString()) + ","
                + toCsv(e.getJobTitle()) + ","
                + toCsv(String.valueOf(e.getSalary())));
        }

        out.close();
    }

    /**
     * Loads a store from a CSV text file.
     *
     * @param file input file
     * @return loaded store
     * @throws IOException when the file cannot be read
     */
    public static Store loadFromFile(File file) throws IOException
    {
        BufferedReader in = new BufferedReader(new FileReader(file));
        ArrayList<String> lines = new ArrayList<String>();
        String line = in.readLine();

        while ((line = in.readLine()) != null)
        {
            if (line.trim().length() > 0)
            {
                lines.add(line);
            }
        }

        in.close();

        Store store = new Store(Math.max(100, lines.size() + 20));
        for (int i = 0; i < lines.size(); i++)
        {
            String[] values = fromCsv(lines.get(i));
            if (values.length >= 10)
            {
                Employee e = new Employee(values[1],
                    firstChar(values[2]),
                    Date.parse(values[3]),
                    values[0],
                    Date.parse(values[7]));
                e.setAddress(values[4]);
                e.setNatInsNo(values[5]);
                e.setPhone(values[6]);
                e.setJobTitle(values[8]);
                e.setSalary(Float.parseFloat(values[9]));
                store.add(e);
            }
        }

        return store;
    }

    private static char firstChar(String text)
    {
        if (text == null || text.length() == 0)
        {
            return 'U';
        }
        return text.charAt(0);
    }

    private static String toCsv(String text)
    {
        if (text == null)
        {
            text = "";
        }
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    private static String[] fromCsv(String line)
    {
        ArrayList<String> values = new ArrayList<String>();
        StringBuffer current = new StringBuffer();
        boolean quoted = false;

        for (int i = 0; i < line.length(); i++)
        {
            char ch = line.charAt(i);
            if (ch == '"')
            {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"')
                {
                    current.append('"');
                    i++;
                }
                else
                {
                    quoted = !quoted;
                }
            }
            else if (ch == ',' && !quoted)
            {
                values.add(current.toString());
                current.setLength(0);
            }
            else
            {
                current.append(ch);
            }
        }
        values.add(current.toString());

        return values.toArray(new String[values.size()]);
    }
}
