import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";

import NewTaskFromProject from "@/emails/NewTaskFromProject";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: Request,
  { params }: { params: { boardId: string } }
) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { boardId } = params;
  const { title, priority, content, section, user, dueDateAt } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  /*  if (!boardId) {
    return new NextResponse("Missing board id", { status: 400 });
  } */

  if (!section) {
    return new NextResponse("Missing section id", { status: 400 });
  }

  //console.log(section, "section");

  //This is when user click on "Add new task" button in project board DnD section
  if (!title || !user || !priority || !content) {
    try {
      const tasksCount = await prismadb.tasks.count({
        where: {
          section: section,
        },
      });

      await prismadb.tasks.create({
        data: {
          priority: "normal",
          title: "New task",
          content: "",
          section: section,
          createdBy: session.user.id,
          updatedBy: session.user.id,
          position: tasksCount > 0 ? tasksCount : 0,
          user: session.user.id,
          taskStatus: "ACTIVE",
        },
      });

      return NextResponse.json({ status: 200 });
    } catch (error) {
      console.log("[NEW_TASK_IN_PROJECT_POST]", error);
      return new NextResponse("Initial error", { status: 500 });
    }
  } else {
    //This is when user click on "Add new task" button in project board page
    try {
      const tasksCount = await prismadb.tasks.count({
        where: {
          section: section,
        },
      });

      const task = await prismadb.tasks.create({
        data: {
          priority: priority,
          title: title,
          content: content,
          dueDateAt: dueDateAt,          
          section: section,
          updatedBy: user,
          createdBy: user,
          position: tasksCount > 0 ? tasksCount : 0,
          user: user,
          taskStatus: "ACTIVE",
        },
      });

      //console.log(user, "user");
      //console.log(session.user.id, "session.user.id");

      //Notification to user who is not a task creator
      if (user !== session.user.id) {
        try {
          const notifyRecipient = await prismadb.users.findUnique({
            where: { id: user },
          });

          const boardData = await prismadb.boards.findUnique({
            where: { id: boardId },
          });

          //console.log(notifyRecipient, "notifyRecipient");

          await resend.emails.send({
            from:
              process.env.NEXT_PUBLIC_APP_NAME +
              " <" +
              process.env.EMAIL_FROM +
              ">",
            to: notifyRecipient?.email!,
            subject:
              session.user.userLanguage === "en"
                ? `New task -  ${title}.`
                : `Eine neue Aufgabe - ${title}.`,
            text: "", // Add this line to fix the types issue
            react: NewTaskFromProject({
              taskFromUser: session.user.name!,
              username: notifyRecipient?.name!,
              userLanguage: notifyRecipient?.userLanguage!,
              taskData: task,
              boardData: boardData,
            }),
          });
          console.log("Email sent to user: ", notifyRecipient?.email!);
        } catch (error) {
          console.log(error);
        }
      }      
      return NextResponse.json({ status: 200 });
    } catch (error) {
      console.log("[NEW_TASK_IN_PROJECT_POST]", error);
      return new NextResponse("Initial error", { status: 500 });
    }
  }
}
